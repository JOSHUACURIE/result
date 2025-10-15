
const ExcelJS = require("exceljs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType } = require("docx");
const fs = require("fs");
const path = require("path");

/**
 * ✅ Export general results to Excel
 * @param {Array} students - list of students with results
 * @returns {string} - file path of generated Excel
 */
exports.exportResultsToExcel = async (students) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Results");

  worksheet.columns = [
    { header: "Admission No", key: "admission_no", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Form", key: "form", width: 10 },
    { header: "Stream", key: "stream", width: 10 },
    { header: "Total Marks", key: "total", width: 15 },
    { header: "Class Rank", key: "class_rank", width: 15 },
    { header: "Stream Rank", key: "stream_rank", width: 15 },
    { header: "Grade", key: "grade", width: 10 },
  ];


  students.forEach((student) => {
    worksheet.addRow({
      admission_no: student.admission_no,
      name: student.name,
      form: student.form,
      stream: student.stream,
      total: student.total,
      class_rank: student.class_rank,
      stream_rank: student.stream_rank,
      grade: student.grade,
    });
  });

  // Save file
  const filePath = path.join(__dirname, `../exports/results_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
};

/**
 * ✅ Export individual student result to Word
 * @param {Object} student - student details
 * @param {Array} subjects - list of subjects with { name, score, teacher, grade }
 * @param {Object} comments - principal and class teacher comments
 * @returns {string} -
 */
exports.exportIndividualResultToWord = async (student, subjects, comments) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "🏫 " + student.school_name, bold: true, size: 32 }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph(" "),
          new Paragraph({
            children: [
              new TextRun(`Name: ${student.name}`),
              new TextRun(`   Admission No: ${student.admission_no}`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`Class: ${student.form} ${student.stream}`),
              new TextRun(`   Total: ${student.total}`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`Class Rank: ${student.class_rank}`),
              new TextRun(`   Stream Rank: ${student.stream_rank}`),
              new TextRun(`   Grade: ${student.grade}`),
            ],
          }),
          new Paragraph(" "),
          // Subject Table
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Subject")], width: { size: 3000 } }),
                  new TableCell({ children: [new Paragraph("Score")], width: { size: 1500 } }),
                  new TableCell({ children: [new Paragraph("Grade")], width: { size: 1500 } }),
                  new TableCell({ children: [new Paragraph("Teacher")], width: { size: 3000 } }),
                ],
              }),
              ...subjects.map(
                (s) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(s.name)] }),
                      new TableCell({ children: [new Paragraph(String(s.score))] }),
                      new TableCell({ children: [new Paragraph(s.grade)] }),
                      new TableCell({ children: [new Paragraph(s.teacher)] }),
                    ],
                  })
              ),
            ],
          }),
          new Paragraph(" "),
          new Paragraph({
            children: [new TextRun({ text: "Principal’s Comment: " + (comments.principal || ""), italics: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Class Teacher’s Comment: " + (comments.class_teacher || ""), italics: true })],
          }),
        ],
      },
    ],
  });

  // Save file
  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(__dirname, `../exports/result_${student.admission_no}_${Date.now()}.docx`);
  fs.writeFileSync(filePath, buffer);

  return filePath;
};

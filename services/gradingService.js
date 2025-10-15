
function gradeSubject(score) {
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 65) return "B";
  if (score >= 60) return "B-";
  if (score >= 55) return "C+";
  if (score >= 50) return "C";
  if (score >= 45) return "C-";
  if (score >= 40) return "D+";
  if (score >= 35) return "D";
  if (score >= 25) return "D-";
  return "E";
}

function gradeTotal(total) {
  const percentage = (total / 1100) * 100;

  if (percentage >= 78) return "A";
  if (percentage >= 73) return "A-";
  if (percentage >= 68) return "B+";
  if (percentage >= 63) return "B";
  if (percentage >= 58) return "B-";
  if (percentage >= 53) return "C+";
  if (percentage >= 48) return "C";
  if (percentage >= 43) return "C-";
  if (percentage >= 38) return "D+";
  if (percentage >= 33) return "D";
  if (percentage >= 25) return "D-";
  return "E";
}


function getGradeWithRemarks(score) {
  const grade = gradeSubject(score);
  let remark = "";

  switch (grade) {
    case "A":
    case "A-":
      remark = "Excellent performance!";
      break;
    case "B+":
    case "B":
    case "B-":
      remark = "Very good, keep it up!";
      break;
    case "C+":
    case "C":
    case "C-":
      remark = "Fair, needs improvement.";
      break;
    case "D+":
    case "D":
    case "D-":
      remark = "Weak, more effort required.";
      break;
    case "E":
      remark = "Very poor, urgent improvement needed.";
      break;
  }

  return { grade, remark };
}

module.exports = {
  gradeSubject,
  gradeTotal,
  getGradeWithRemarks,
};

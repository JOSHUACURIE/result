const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Stream = sequelize.define(
  "Stream",
  {
    stream_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stream_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "classes",
        key: "class_id",
      },
      onDelete: "CASCADE",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "streams",
    timestamps: true,
    underscored: true,
  }
);

// ✅ Static methods
Stream.createStream = async function (stream_name, class_id) {
  return await this.create({ stream_name, class_id });
};

Stream.getAllStreams = async function () {
  return await this.findAll({
    order: [["stream_name", "ASC"]],
    where: { is_active: true },
  });
};

Stream.updateStream = async function (stream_id, stream_name, class_id) {
  const stream = await this.findByPk(stream_id);
  if (!stream) return null;
  await stream.update({ stream_name, class_id });
  return stream;
};

Stream.deleteStream = async function (stream_id) {
  const stream = await this.findByPk(stream_id);
  if (!stream) return null;
  await stream.update({ is_active: false });
  return stream;
};

module.exports = Stream;

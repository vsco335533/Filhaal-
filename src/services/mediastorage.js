import fs from "fs";
import path from "path";

export const saveLocalFile = (file) => {
  return `/uploads/${file.filename}`;
};

/*
LATER (AWS S3):
export const saveS3File = async (file) => {
  return s3Url;
};
*/

"use strict";

const router = require("express").Router();
const documentController = require("../controllers/documentController");
const { uploadSingleToS3, upload } = require("../middlewares/awsS3Upload");
const { checkDocumentUpload } = require("../middlewares/fileUploadHandler");
const idValidation = require("../middlewares/idValidation");
const {
  checkEmailVerification,
  isLogin,
  isActive,
  isDocumentOwnerOrAdmin,
} = require("../middlewares/permissions");

// URL: /documents

router.use([isLogin, isActive, checkEmailVerification]);

router
  .route("/")
  .get(documentController.list)
  .post(
    upload.single("fileUrl"),
    uploadSingleToS3("document"),
    documentController.create
  );
router
  .route("/:id")
  .all(idValidation, isDocumentOwnerOrAdmin)
  .get(documentController.read)
  .put(
    upload.single("fileUrl"),
    uploadSingleToS3("document"),
    checkDocumentUpload,
    documentController.update
  )
  .patch(
    upload.single("fileUrl"),
    uploadSingleToS3("document"),
    checkDocumentUpload,
    documentController.update
  )
  .delete(documentController.delete);

module.exports = router;

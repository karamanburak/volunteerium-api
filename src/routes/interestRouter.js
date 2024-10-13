"use strict";

const router = require("express").Router();

const interestController = require("../controllers/interestController");
const idValidation = require("../middlewares/idValidation");
const { isAdmin } = require("../middlewares/permissions");

/* ------------------------------------------------------- */

// URL: /interests

router
  .route("/")
  .get(interestController.list)
  .post(isAdmin, interestController.create);

router
  .route("/:id")
  .all(idValidation, isAdmin)
  .get(interestController.read)
  .put(interestController.update)
  .patch(interestController.update)
  .delete(interestController.delete);

/* ------------------------------------------------------- */
module.exports = router;

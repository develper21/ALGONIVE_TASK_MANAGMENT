const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { getUsers, getUserById } = require("../controllers/userController");
const { validateObjectId } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.get("/", protect, adminOnly, getUsers); // get all users (Admin only)
router.get("/:id", protect, validateObjectId("id"), getUserById); // get specific user
//router.delete("/:id", protect, adminOnly, validateObjectId("id"), deleteUser); // delete user (Admin only)

module.exports = router;

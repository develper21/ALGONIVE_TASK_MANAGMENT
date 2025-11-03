const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

/*
 *   @desc get all users (Admin only)
 *   @route GET /api/users
 *   @access private (Admin)
 */
const getUsers = async (req, res) => {
  try {
    const users = User.find({ role: "member" }).select("-password");

    // add task count to each user
    const usersWithTaskCount = await Promise.all(
      (
        await users
      ).map(async (user) => {
        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Completed",
        });

        return {
          ...user._doc, // includes all existing data
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      })
    );

    res.json(usersWithTaskCount);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/*
 *   @desc get specific user
 *   @route GET /api/users/:id
 *   @access private
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/*
 *   @desc delete a user (Admin only)
 *   @route DELETE /api/users/:id
 *   @access private (Admin)
 */
// const deleteUser = async () => {
//   try {
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

module.exports = { getUsers, getUserById };

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc register a new user
// @route POST /api/auth/register
// @access public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, profileImageUrl, gender, adminInviteToken } =
      req.body;

    // check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "User Already Exists!" });
    }

    // determine user role: admin if correct token is provided otherwise member
    let role = "member";
    if (adminInviteToken) {
      if (adminInviteToken === process.env.ADMIN_INVITE_TOKEN) {
        role = "admin";
      } else {
        return res.status(400).json({ message: "Invalid admin invite token" });
      }
    }

    // hash password (encryption)
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // create new user
    const user = await User.create({
      name,
      email,
      password: hashPassword,
      profileImageUrl,
      gender: gender || "male",
      role,
    });

    // return user data with JWT
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      profileDisplayUrl: user.profileDisplayUrl,
      gender: user.gender,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// @desc login user
// @route POST /api/auth/login
// @access public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    //compare password
    const isMach = await bcrypt.compare(password, user.password);
    if (!isMach) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // return user data with JWT
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      profileDisplayUrl: user.profileDisplayUrl,
      gender: user.gender,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "server error!", error: error.message });
  }
};

// @desc get user profile
// @route GET /api/auth/profile
// @access private (requires JWT)
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    console.log("-->", req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "server error!", error: error.message });
  }
};

// @desc update user profile
// @route PUT /api/auth/profile
// @access private (requires JWT)
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.gender = req.body.gender || user.gender;
    user.profileImageUrl = req.body.profileImageUrl !== undefined ? req.body.profileImageUrl : user.profileImageUrl;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImageUrl: updatedUser.profileImageUrl,
      profileDisplayUrl: updatedUser.profileDisplayUrl,
      gender: updatedUser.gender,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: "server error!", error: error.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile };

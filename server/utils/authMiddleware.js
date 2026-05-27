import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token, access denied",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found, token invalid",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

// export const adminMiddleware = (req, res, next) => {
//   if (
//     role === "admin" &&
//     process.env.NODE_ENV === "production" &&
//     adminInviteToken !== process.env.ADMIN_INVITE_TOKEN
//   ) {
//     return res.status(403).json({
//       success: false,
//       message: "Invalid admin invite token",
//     });
//   } else {
//     res.status(403).json({
//       success: false,
//       message: "Access denied. Admin privileges required.",
//     });
//   }
// };

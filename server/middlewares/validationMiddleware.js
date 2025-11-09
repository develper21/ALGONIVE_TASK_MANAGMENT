const validator = require("validator");

// Validate and sanitize user registration input
const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }
  if (name && name.length > 100) {
    errors.push("Name must not exceed 100 characters");
  }

  // Validate email
  if (!email || !validator.isEmail(email)) {
    errors.push("Please provide a valid email address");
  }

  // Validate password
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (password && password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  // Sanitize inputs
  req.body.name = name.trim();
  const normalizedEmail = validator.normalizeEmail(email);
  req.body.email = normalizedEmail || email.toLowerCase().trim();

  next();
};

// Validate login input
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !validator.isEmail(email)) {
    errors.push("Please provide a valid email address");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const normalizedEmail = validator.normalizeEmail(email);
  req.body.email = normalizedEmail || email.toLowerCase().trim();

  next();
};

// Validate task creation/update
const validateTask = (req, res, next) => {
  const { title, description, priority, dueDate, assignedTo } = req.body;
  const errors = [];

  // Validate title
  if (title !== undefined) {
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      errors.push("Task title must be at least 3 characters long");
    }
    if (title && title.length > 200) {
      errors.push("Task title must not exceed 200 characters");
    }
  }

  // Validate description
  if (description !== undefined && description && description.length > 2000) {
    errors.push("Task description must not exceed 2000 characters");
  }

  // Validate priority
  if (priority !== undefined && !["Low", "Medium", "High"].includes(priority)) {
    errors.push("Priority must be Low, Medium, or High");
  }

  // Validate dueDate
  if (dueDate !== undefined) {
    if (!validator.isISO8601(dueDate)) {
      errors.push("Due date must be a valid date");
    }
  }

  // Validate assignedTo
  if (assignedTo !== undefined) {
    if (!Array.isArray(assignedTo)) {
      errors.push("assignedTo must be an array");
    } else if (assignedTo.length === 0) {
      errors.push("At least one user must be assigned to the task");
    } else {
      // Validate each user ID is a valid MongoDB ObjectId
      const invalidIds = assignedTo.filter(
        (id) => !validator.isMongoId(String(id))
      );
      if (invalidIds.length > 0) {
        errors.push("Invalid user IDs in assignedTo array");
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  // Sanitize text inputs
  if (title) req.body.title = title.trim();
  if (description) req.body.description = description.trim();

  next();
};

// Validate user profile update
const validateProfileUpdate = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }
    if (name.length > 100) {
      errors.push("Name must not exceed 100 characters");
    }
  }

  if (email !== undefined && !validator.isEmail(email)) {
    errors.push("Please provide a valid email address");
  }

  if (password !== undefined) {
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (password.length > 128) {
      errors.push("Password must not exceed 128 characters");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  // Sanitize inputs
  if (name) req.body.name = name.trim();
  if (email) {
    const normalizedEmail = validator.normalizeEmail(email);
    req.body.email = normalizedEmail || email.toLowerCase().trim();
  }

  next();
};

// Validate MongoDB ObjectId
const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!validator.isMongoId(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    next();
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateTask,
  validateProfileUpdate,
  validateObjectId,
};

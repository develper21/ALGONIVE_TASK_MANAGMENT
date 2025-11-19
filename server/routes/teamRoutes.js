import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../utils/authMiddleware.js';

const router = express.Router();

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Team name is required' 
      });
    }

    const team = new Team({
      name,
      description: description || '',
      color: color || '#6366f1',
      createdBy: req.user._id,
      members: [req.user._id]
    });

    await team.save();

    // Add team to user's teams array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id }
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('members', 'name email role')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team: populatedTeam
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating team' 
    });
  }
});

// @route   GET /api/teams
// @desc    Get all teams for current user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find({ members: req.user._id })
      .populate('members', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching teams' 
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get team by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members', 'name email role avatar')
      .populate('createdBy', 'name email');

    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    // Check if user is a member
    if (!team.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching team' 
    });
  }
});

// @route   POST /api/teams/:id/add-member
// @desc    Add member to team
// @access  Private
router.post('/:id/add-member', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    // Check if requester is team creator or admin
    if (team.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only team creator can add members' 
      });
    }

    // Find user by email
    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found with this email' 
      });
    }

    // Check if already a member
    if (team.members.includes(userToAdd._id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already a team member' 
      });
    }

    // Add member to team
    team.members.push(userToAdd._id);
    await team.save();

    // Add team to user's teams
    userToAdd.teams.push(team._id);
    await userToAdd.save();

    // Create notification
    const notification = new Notification({
      user: userToAdd._id,
      actor: req.user._id,
      type: 'team_invite',
      message: `You have been added to team "${team.name}" by ${req.user.name}`,
      link: `/teams/${team._id}`
    });
    await notification.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('members', 'name email role avatar')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Member added successfully',
      team: populatedTeam
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error adding member' 
    });
  }
});

// @route   DELETE /api/teams/:id/remove-member/:userId
// @desc    Remove member from team
// @access  Private
router.delete('/:id/remove-member/:userId', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    // Check if requester is team creator or admin
    if (team.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only team creator can remove members' 
      });
    }

    // Remove member from team
    team.members = team.members.filter(m => m.toString() !== req.params.userId);
    await team.save();

    // Remove team from user's teams
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { teams: team._id }
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error removing member' 
    });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    // Check if requester is team creator
    if (team.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only team creator can update team' 
      });
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (color) team.color = color;

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('members', 'name email role')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Team updated successfully',
      team: populatedTeam
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating team' 
    });
  }
});

export default router;

import React, { useState, useEffect, useContext } from "react";
import NewDashboardLayout from "../../components/layouts/NewDashboardLayout";
import { UserContext } from "../../context/userContext";
import { useNotification } from "../../context/NotificationContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import uploadImage from "../../utils/uploadImage";
import { 
  FaTwitter, FaLinkedin, FaInstagram, FaGithub, FaGlobe,
  FaPlus, FaTimes, FaEdit, FaSave, FaUpload, FaFileAlt
} from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";

const UserProfile = () => {
  const { user, updateUser } = useContext(UserContext);
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    bio: "",
    skills: [],
    experience: [],
    socialLinks: {
      twitter: "",
      linkedin: "",
      instagram: "",
      github: "",
      leetcode: "",
      website: ""
    }
  });
  
  const [newSkill, setNewSkill] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
      const userData = response.data;
      setProfileData({
        name: userData.name || "",
        email: userData.email || "",
        bio: userData.bio || "",
        skills: userData.skills || [],
        experience: userData.experience || [],
        socialLinks: userData.socialLinks || {
          twitter: "",
          linkedin: "",
          instagram: "",
          github: "",
          leetcode: "",
          website: ""
        }
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      addNotification({
        message: "Failed to load profile",
        type: "error"
      });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let profileImageUrl = user?.profileImageUrl;
      let resumeUrl = user?.resumeUrl;

      // Upload profile image if changed
      if (profileImage) {
        const imageUploadRes = await uploadImage(profileImage);
        profileImageUrl = imageUploadRes?.imageUrl || profileImageUrl;
      }

      // Upload resume if changed
      if (resumeFile) {
        const resumeUploadRes = await uploadImage(resumeFile);
        resumeUrl = resumeUploadRes?.imageUrl || resumeUrl;
      }

      const response = await axiosInstance.put(API_PATHS.AUTH.GET_PROFILE, {
        ...profileData,
        profileImageUrl,
        resumeUrl
      });

      updateUser(response.data);
      setEditing(false);
      setProfileImage(null);
      setResumeFile(null);
      
      addNotification({
        message: "Profile updated successfully!",
        type: "success"
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      addNotification({
        message: error.response?.data?.message || "Failed to update profile",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData({
        ...profileData,
        skills: [...profileData.skills, newSkill.trim()]
      });
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove) => {
    setProfileData({
      ...profileData,
      skills: profileData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const addExperience = () => {
    setProfileData({
      ...profileData,
      experience: [
        ...profileData.experience,
        {
          company: "",
          position: "",
          startDate: "",
          endDate: "",
          current: false,
          description: ""
        }
      ]
    });
  };

  const updateExperience = (index, field, value) => {
    const updatedExperience = [...profileData.experience];
    updatedExperience[index][field] = value;
    setProfileData({
      ...profileData,
      experience: updatedExperience
    });
  };

  const removeExperience = (index) => {
    setProfileData({
      ...profileData,
      experience: profileData.experience.filter((_, i) => i !== index)
    });
  };

  const socialIcons = {
    twitter: <FaTwitter className="text-blue-400" />,
    linkedin: <FaLinkedin className="text-blue-600" />,
    instagram: <FaInstagram className="text-pink-500" />,
    github: <FaGithub className="text-gray-800" />,
    leetcode: <SiLeetcode className="text-orange-500" />,
    website: <FaGlobe className="text-indigo-600" />
  };

  return (
    <NewDashboardLayout activeMenu="Profile">
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your personal information and preferences</p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <FaEdit /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  fetchUserProfile();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <FaSave /> {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          </div>
          
          {/* Profile Info */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-24 mb-8">
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-4 border-white shadow-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img
                      src={URL.createObjectURL(profileImage)}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-7xl">
                      {user?.gender === 'female' ? '👩' : user?.gender === 'other' ? '🧑' : '👨'}
                    </div>
                  )}
                </div>
                {editing && (
                  <label className="absolute bottom-2 right-2 bg-indigo-600 text-white p-3 rounded-full cursor-pointer hover:bg-indigo-700 transition shadow-lg">
                    <FaUpload className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProfileImage(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              
              <div className="flex-1">
                {editing ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-300 focus:border-indigo-600 outline-none w-full mb-2"
                  />
                ) : (
                  <h2 className="text-3xl font-bold text-gray-900">{user?.name}</h2>
                )}
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <span>📧</span> {user?.email}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                    user?.role === "admin" 
                      ? "bg-purple-100 text-purple-700 border border-purple-200" 
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}>
                    {user?.role === "admin" ? "👑 Admin" : "👤 Team Member"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">About Me</h3>
              {editing ? (
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows="4"
                  maxLength="500"
                />
              ) : (
                <p className="text-gray-700">{profileData.bio || "No bio added yet."}</p>
              )}
            </div>

            {/* Skills Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {profileData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                    {editing && (
                      <button
                        onClick={() => removeSkill(skill)}
                        className="hover:text-red-600"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSkill()}
                    placeholder="Add a skill..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    <FaPlus />
                  </button>
                </div>
              )}
            </div>

            {/* Experience Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Experience</h3>
                {editing && (
                  <button
                    onClick={addExperience}
                    className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                  >
                    <FaPlus /> Add Experience
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {profileData.experience.map((exp, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    {editing ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperience(index, "company", e.target.value)}
                              placeholder="Company"
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={exp.position}
                              onChange={(e) => updateExperience(index, "position", e.target.value)}
                              placeholder="Position"
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="date"
                              value={exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : ""}
                              onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="date"
                              value={exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : ""}
                              onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                              disabled={exp.current}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                            />
                          </div>
                          <button
                            onClick={() => removeExperience(index)}
                            className="ml-2 text-red-600 hover:text-red-700"
                          >
                            <FaTimes />
                          </button>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => updateExperience(index, "current", e.target.checked)}
                            className="rounded"
                          />
                          Currently working here
                        </label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => updateExperience(index, "description", e.target.value)}
                          placeholder="Description..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows="2"
                        />
                      </div>
                    ) : (
                      <>
                        <h4 className="font-semibold text-gray-900">{exp.position}</h4>
                        <p className="text-gray-600">{exp.company}</p>
                        <p className="text-sm text-gray-500">
                          {exp.startDate && new Date(exp.startDate).toLocaleDateString()} - {exp.current ? "Present" : (exp.endDate && new Date(exp.endDate).toLocaleDateString())}
                        </p>
                        {exp.description && <p className="mt-2 text-gray-700 text-sm">{exp.description}</p>}
                      </>
                    )}
                  </div>
                ))}
                {profileData.experience.length === 0 && !editing && (
                  <p className="text-gray-500 text-sm">No experience added yet.</p>
                )}
              </div>
            </div>

            {/* Resume Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Resume</h3>
              {editing ? (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                    <FaFileAlt />
                    <span className="text-sm">{resumeFile ? resumeFile.name : "Choose file"}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setResumeFile(e.target.files[0])}
                    />
                  </label>
                  {user?.resumeUrl && (
                    <a
                      href={user.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      View current resume
                    </a>
                  )}
                </div>
              ) : (
                user?.resumeUrl ? (
                  <a
                    href={user.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                  >
                    <FaFileAlt /> View Resume
                  </a>
                ) : (
                  <p className="text-gray-500 text-sm">No resume uploaded yet.</p>
                )
              )}
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(profileData.socialLinks).map((platform) => (
                  <div key={platform} className="flex items-center gap-3">
                    <div className="text-2xl">{socialIcons[platform]}</div>
                    {editing ? (
                      <input
                        type="url"
                        value={profileData.socialLinks[platform]}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          socialLinks: {
                            ...profileData.socialLinks,
                            [platform]: e.target.value
                          }
                        })}
                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    ) : (
                      profileData.socialLinks[platform] ? (
                        <a
                          href={profileData.socialLinks[platform]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-indigo-600 hover:text-indigo-700 text-sm truncate"
                        >
                          {profileData.socialLinks[platform]}
                        </a>
                      ) : (
                        <span className="flex-1 text-gray-400 text-sm">Not added</span>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </NewDashboardLayout>
  );
};

export default UserProfile;

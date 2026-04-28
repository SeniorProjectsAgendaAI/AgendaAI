import React, { useEffect, useRef, useState } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { FaUser, FaPlus } from "react-icons/fa";
import api from "../../services/api";
import { useCreateModal } from "../../contexts/CreateModalContext";
import "./profilebutton.css";

// Event used to refresh the top-right avatar after a profile image upload.
const PROFILE_PICTURE_UPDATED_EVENT = "agendaai-profile-picture-updated";

const ProfileButton: React.FC = () => {
  const navigate = useNavigate();
  const { openCreate } = useCreateModal();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const profileImageUrlRef = useRef<string | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const setProfileImageObjectUrl = (imageUrl: string | null) => {
    if (profileImageUrlRef.current) {
      URL.revokeObjectURL(profileImageUrlRef.current);
    }

    profileImageUrlRef.current = imageUrl;
    setProfileImageUrl(imageUrl);
  };

  // Loads the saved profile image for the top-right profile button.
  const loadProfilePicture = async () => {
    try {
      const response = await api.get("/users/me/profile-picture", {
        responseType: "blob",
      });
      setProfileImageObjectUrl(URL.createObjectURL(response.data));
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setProfileImageObjectUrl(null);
      } else {
        console.error("Error loading header profile picture:", error);
      }
    }
  };

  useEffect(() => {
    // Loads the fallback initial when the user has no saved profile image.
    const loadUserInitial = async () => {
      try {
        const attributes = await fetchUserAttributes();
        const displayName = attributes.name || attributes.email || "";
        setInitial(displayName.trim().charAt(0).toUpperCase());
      } catch (error) {
        console.error("Error loading profile initials:", error);
      }
    };

    loadUserInitial();
    loadProfilePicture();

    window.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, loadProfilePicture);

    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, loadProfilePicture);
      document.removeEventListener("mousedown", handleClickOutside);
      if (profileImageUrlRef.current) {
        URL.revokeObjectURL(profileImageUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="globalTopBar">
      <div className="globalCreateWrapper" ref={createMenuRef}>
        <button
          type="button"
          className="globalCreateButton"
          onClick={() => setShowCreateMenu((prev) => !prev)}
          aria-label="Create new"
          title="Create new"
        >
          <FaPlus className="globalCreateIcon" />
        </button>
        {showCreateMenu && (
          <div className="globalCreateMenu">
            <button
              onClick={() => {
                setShowCreateMenu(false);
                openCreate("task");
              }}
            >
              Task
            </button>
            <button
              onClick={() => {
                setShowCreateMenu(false);
                openCreate("event");
              }}
            >
              Event
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="globalProfileButton"
        onClick={() => navigate("/profilecontainer")}
        aria-label="Open profile"
        title="Open profile"
      >
        {profileImageUrl ? (
          <img src={profileImageUrl} alt="" className="globalProfileImage" />
        ) : initial ? (
          <span className="globalProfileInitial">{initial}</span>
        ) : (
          <FaUser className="globalProfileIcon" />
        )}
      </button>
    </div>
  );
};

export { PROFILE_PICTURE_UPDATED_EVENT };
export default ProfileButton;

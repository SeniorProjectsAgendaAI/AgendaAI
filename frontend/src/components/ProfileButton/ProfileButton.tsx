import React, { useEffect, useRef, useState } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import api from "../../services/api";
import "./profilebutton.css";

// Event used to refresh the top-right avatar after a profile image upload.
const PROFILE_PICTURE_UPDATED_EVENT = "agendaai-profile-picture-updated";

const ProfileButton: React.FC = () => {
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState("");
  const profileImageUrlRef = useRef<string | null>(null);

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

    return () => {
      window.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, loadProfilePicture);
      if (profileImageUrlRef.current) {
        URL.revokeObjectURL(profileImageUrlRef.current);
      }
    };
  }, []);

  return (
    // Opens the full profile page when clicked.
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
  );
};

export { PROFILE_PICTURE_UPDATED_EVENT };
export default ProfileButton;

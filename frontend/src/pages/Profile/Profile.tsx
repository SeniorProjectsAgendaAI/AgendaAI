import React, { useState, useRef } from "react";
import "./profile.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useTheme } from "../../contexts/ThemeContext";

interface ProfileData {
    username?: string;
    fullName?: string;
    email?: string;
    password?: string;
}

const Profile: React.FC = () => {
    const { signOut, user } = useAuthenticator();
    const { theme, toggleTheme } = useTheme();

    const [profileData, setProfileData] = useState<ProfileData>({
        username: "BiniToo",
        fullName: "Biniam",
        email: "bini@gmail.com",
        password: "samplepassword123" 
    });

    const [showPassword, setShowPassword] = useState<boolean>(false);

    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    //profile picture change function
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setProfileImagePreview(imageUrl);
            
            // file CONNECT TO BACKEND
        }
    };

    // NEW: Programmatically click the hidden file input
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="profile">
        
            {/* Profile Pic */}
            <div className="profile-picture-section">
                <div className="profile-picture-wrapper" onClick={triggerFileInput}>
                    {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile Preview" className="profile-picture" />
                    ) : (
                        <div className="profile-picture-placeholder">
                            <span>Upload</span>
                        </div>
                    )}
                </div>
                {/* input file restrictios */}
                <input
                    type="file"
                    accept="image/png"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                />
            </div>
            <p className="profile-greeting">
                Hi, {profileData.fullName}
            </p>

            <div className="profile-form">
                <div className="form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        name="username"
                        value={profileData.username}
                        onChange={handleInputChange}
                    />
                </div>
                
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        name="fullName"
                        value={profileData.fullName}
                        onChange={handleInputChange}
                    />
                </div>
                
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                    />
                </div>
                
                <div className="form-group password-group">
                    <label>Password</label>
                    <div className="password-input-container">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={profileData.password}
                            onChange={handleInputChange}
                        />
                        <button
                            type="button"
                            className="show-password-btn"
                            onClick={togglePasswordVisibility}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="action-buttons">
                <button
                    onClick={toggleTheme}
                    className="themeToggleBtn">
                    Switch to {theme === "light" ? "Dark" : "Light"} Mode
                </button>
                <button onClick={signOut} className="logoutBtn">
                    Delete Account
                </button>
                <button onClick={signOut} className="logoutBtn">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Profile;
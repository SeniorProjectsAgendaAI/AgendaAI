import React, { useState } from "react";
import "./profile.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useTheme } from "../../contexts/ThemeContext";

interface ProfileData {
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
}

const Profile: React.FC = () => {
    const { signOut, user } = useAuthenticator();
    const { theme, toggleTheme } = useTheme();

    const [profileData, setProfileData] = useState<ProfileData>({
        username: "BiniToo",
        firstName: "Biniam",
        lastName: "Gashaw",
        email: "bini@gmail.com",
        password: "samplepassword123" 
    });

    const [showPassword, setShowPassword] = useState<boolean>(false);

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

    return (
        <div className="profile">
            <p className="profile-greeting">
                Hi, {profileData.firstName} {profileData.lastName}
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
                    <label>First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                    />
                </div>
                
                <div className="form-group">
                    <label>Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
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
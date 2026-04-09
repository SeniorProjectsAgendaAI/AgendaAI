import React from "react";
import "./profile.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
import pfp from "../../assets/pfp.jpg";
import { useTheme } from "../../contexts/ThemeContext";
//alex, a start for future functionality including delete account, and edit profile
const Profile = () => {
    const { signOut, user } = useAuthenticator();
    const { theme, toggleTheme } = useTheme();
    return (
        <div className="profile">
            <h1>Profile Page</h1>
            <h2>Potential Image</h2>
            <img
            src={pfp}
            alt="placeholder profile picture"
            />
            <p>Hi, {user?.signInDetails?.loginId}</p>
            <button
                onClick={toggleTheme}
                className="themeToggleBtn">
                Switch to {theme === "light" ? "Dark" : "Light"} Mode
            </button>
            <button onClick={signOut} className="logoutBtn">
                Logout
            </button>
        </div>
    );
};


export default Profile;
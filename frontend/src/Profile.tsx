import React from "react";
import "./profile.css";
import { useAuthenticator } from "@aws-amplify/ui-react";

const Profile = () => {
    const { signOut, user } = useAuthenticator();
    return (
        <div className="profile">
            <h1>Profile Page</h1>
            <h2>Potential Image</h2>
            <img
            src="./assets/pfp.jpg"
            alt="placeholder profile picture"
            />
            <p>Hi, {user?.signInDetails?.loginId}</p>
            <button onClick={signOut}>
                Logout
            </button>
        </div>
    );
};

export default Profile;
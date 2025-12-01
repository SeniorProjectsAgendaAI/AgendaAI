import {
  Authenticator,
  withAuthenticator,
  WithAuthenticatorProps,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

function App({ signOut, user }: WithAuthenticatorProps) {
  return (
    <div>
      <header className="App-header">
        <h1>AgendaAI</h1>
        <main>
          <h1>Hello {user?.username}</h1>
          <button onClick={signOut}>Sign out</button>
        </main>
      </header>
    </div>
  );
}

export default withAuthenticator(App);

const firebaseConfig = {
  apiKey: "AIzaSyD5G-XTk3fEosX3a5WkuT0S_DFwp84HOCs",
  authDomain: "dormharmony.firebaseapp.com",
  databaseURL: "https://dormharmony-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dormharmony",
  storageBucket: "dormharmony.firebasestorage.app",
  messagingSenderId: "1082565065825",
  appId: "1:1082565065825:web:b524a6e0413e55f41a3e20",
  measurementId: "G-78PR4ML8XD"
};

// 2. INITIALIZE FIREBASE
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// 3. AUTHENTICATION LOGIC
function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Please enter both email and password!");

    if (type === 'signup') {
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => alert("Account Created! Please set up your profile."))
            .catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => toggleView(true))
            .catch(err => alert(err.message));
    }
}

function toggleView(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-section').classList.add('d-none');
        document.getElementById('app-section').classList.remove('d-none');
        loadMyProfile();
    } else {
        location.reload();
    }
}

function logout() { auth.signOut().then(() => toggleView(false)); }

// 4. SAVE PROFILE DATA (ALL 10 PARAMETERS)
function saveProfile() {
    const user = auth.currentUser;
    if (!user) return alert("Session expired. Please login again.");

    const data = {
        name: document.getElementById('user-name').value || "Anonymous Student",
        sleep: parseInt(document.getElementById('p-sleep').value),
        clean: parseInt(document.getElementById('p-clean').value),
        noise: parseInt(document.getElementById('p-noise').value),
        social: parseInt(document.getElementById('p-social').value),
        ac: parseInt(document.getElementById('p-ac').value),
        share: parseInt(document.getElementById('p-share').value),
        lights: parseInt(document.getElementById('p-lights').value),
        guests: parseInt(document.getElementById('p-guests').value),
        temp: parseInt(document.getElementById('p-temp').value),
        smoke: parseInt(document.querySelector('input[name="smoke"]:checked').value),
        email: user.email
    };

    db.ref('users/' + user.uid).set(data).then(() => {
        alert("Cloud Sync Successful! 📟");
        runMatcher();
    });
}

// 5. THE AI MATCHING ENGINE (Manhattan Distance Heuristic)
function runMatcher() {
    const user = auth.currentUser;
    if (!user) return;

    const resultsDiv = document.getElementById('match-results');
    
    // 🔥 CHANGE: We use .on instead of .once to keep the connection LIVE
    db.ref('users').on('value', (allSnap) => {
        // 1. Get MY current data from the snapshot first
        const allData = allSnap.val();
        const me = allData[user.uid];
        
        if (!me) {
            resultsDiv.innerHTML = "<p class='text-center p-4 text-warning'>Please save your profile first!</p>";
            return;
        }

        let html = "";
        let matches = [];

        // 2. Loop through every student in the cloud
        allSnap.forEach((child) => {
            const other = child.val();

            // SKIP: Don't match with yourself or empty profiles
            if (child.key === user.uid || !other.name) return;

            // LOGIC: Hard Constraint (Smoking)
            if (me.smoke !== other.smoke) return;

            // LOGIC: Manhattan Distance across 9 lifestyle traits
            const traits = ['sleep', 'clean', 'noise', 'social', 'ac', 'share', 'lights', 'guests', 'temp'];
            let totalDiff = 0;
            traits.forEach(t => {
                totalDiff += Math.abs((me[t] || 3) - (other[t] || 3));
            });

            const score = Math.round((1 - (totalDiff / 36)) * 100);
            
            if (score > 25) {
                matches.push({ ...other, score });
            }
        });

        // 3. Sort by highest score
        matches.sort((a, b) => b.score - a.score);

        // 4. Update the UI
        matches.forEach(m => {
            const color = m.score > 80 ? 'success' : 'primary';
            html += `
                <div class="card p-3 mb-2 border-start border-4 border-${color} shadow-sm animate-in">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${m.name}</h6>
                            <small class="text-muted">${m.email}</small>
                        </div>
                        <span class="badge bg-${color}">${m.score}% Match</span>
                    </div>
                </div>`;
        });

        resultsDiv.innerHTML = html || "<p class='text-center p-4'>Waiting for compatible roommates...</p>";
        console.log("Real-time update received from Cloud! ⚡");
    });
}
// 6. HELPER: Load profile data on login
function loadMyProfile() {
    const user = auth.currentUser;
    db.ref('users/' + user.uid).once('value', (snap) => {
        const data = snap.val();
        if (data) {
            document.getElementById('user-name').value = data.name;
            document.getElementById('p-sleep').value = data.sleep;
            document.getElementById('p-clean').value = data.clean;
            document.getElementById('p-noise').value = data.noise;
            document.getElementById('p-social').value = data.social;
            document.getElementById('p-ac').value = data.ac;
            document.getElementById('p-share').value = data.share;
            document.getElementById('p-lights').value = data.lights;
            document.getElementById('p-guests').value = data.guests;
            document.getElementById('p-temp').value = data.temp;
            if (data.smoke === 1) document.getElementById('smokeYes').checked = true;
            runMatcher();
        }
    });
}

// Persist login session
auth.onAuthStateChanged(user => { if (user) toggleView(true); });
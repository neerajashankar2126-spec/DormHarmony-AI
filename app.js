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
    // 1. Get input values
    const email = document.getElementById('email').value.toLowerCase().trim();
    const password = document.getElementById('password').value;
    const authBtn = event.target; // Grabs the button you clicked

    // 2. THE GATEKEEPER: Institutional Domain Check
    // This ensures only SRM emails can sign up or login
    if (!email.endsWith("@srmist.edu.in")) {
        alert("🚨 Access Denied: Please use your official @srmist.edu.in email.");
        return; 
    }

    if (!email || !password) {
        alert("Please enter both email and password!");
        return;
    }

    // UI Feedback: Show the user the app is "thinking"
    const originalText = authBtn.innerText;
    authBtn.innerText = "Processing...";
    authBtn.disabled = true;

    if (type === 'signup') {
        // --- SIGN UP ---
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                alert("Account Created! 📟 Welcome to DormHarmony.");
                authBtn.disabled = false;
                authBtn.innerText = originalText;
            })
            .catch(err => {
                alert(err.message);
                authBtn.disabled = false;
                authBtn.innerText = originalText;
            });
    } else {
        // --- LOGIN ---
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                toggleView(true);
            })
            .catch(err => {
                alert(err.message);
                authBtn.disabled = false;
                authBtn.innerText = originalText;
            });
    }
}

function toggleView(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-section').classList.add('d-none');
        document.getElementById('app-section').classList.remove('d-none');
        runMatcher(); // Start the live listener for roommates
    } else {
        location.reload();
    }
}

function logout() { 
    auth.signOut().then(() => toggleView(false)); 
}

// 4. SAVE PROFILE DATA (10 Traits + Gender + Name)
function saveProfile() {
    const user = auth.currentUser;
    if (!user) return alert("Please Login First!");

    // Gathering all 11 Data Points
    const data = {
        name: document.getElementById('user-name').value || "SRM Student",
        gender: document.querySelector('input[name="gender"]:checked').value, 
        sleep: parseInt(document.getElementById('p-sleep').value),
        clean: parseInt(document.getElementById('p-clean').value),
        noise: parseInt(document.getElementById('p-noise').value),
        social: parseInt(document.getElementById('p-social').value),
        ac: parseInt(document.getElementById('p-ac').value),
        share: parseInt(document.getElementById('p-share').value),
        lights: parseInt(document.getElementById('p-lights').value),
        guests: parseInt(document.getElementById('p-guests').value),
        temp: parseInt(document.getElementById('p-temp').value),
        email: user.email
    };

    db.ref('users/' + user.uid).set(data).then(() => {
        alert("Cloud Sync Successful! 📟");
    });
}

// 5. THE AI MATCHING ENGINE (Real-Time Live Listener)
function runMatcher() {
    const user = auth.currentUser;
    if (!user) return;

    const resultsDiv = document.getElementById('match-results');
    
    // .on('value') keeps the connection open for live updates
    db.ref('users').on('value', (allSnap) => {
        const allData = allSnap.val();
        if (!allData || !allData[user.uid]) {
            resultsDiv.innerHTML = "<p class='text-center p-4 text-warning'>Save your profile to see matches!</p>";
            return;
        }

        const me = allData[user.uid];
        let html = "";
        let matches = [];

        allSnap.forEach((child) => {
            const other = child.val();

            // SKIP: Don't match with self or empty profiles
            if (child.key === user.uid || !other.name) return;

            // 🔥 HARD CONSTRAINT 1: Gender (Must be same)
            if (me.gender !== other.gender) return;

            // AI LOGIC: Manhattan Distance across 9 lifestyle traits
            const traits = ['sleep', 'clean', 'noise', 'social', 'ac', 'share', 'lights', 'guests', 'temp'];
            let totalDiff = 0;
            traits.forEach(t => {
                totalDiff += Math.abs((me[t] || 3) - (other[t] || 3));
            });

            // Scoring: (1 - normalized difference) * 100
            const score = Math.round((1 - (totalDiff / 36)) * 100);
            
            if (score > 30) {
                matches.push({ ...other, score });
            }
        });

        // Sort by highest compatibility
        matches.sort((a, b) => b.score - a.score);

        // Render to UI
        matches.forEach(m => {
            const color = m.score > 80 ? 'success' : 'primary';
            html += `
                <div class="card p-3 mb-2 border-start border-4 border-${color} shadow-sm">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${m.name} <small class="text-muted">(${m.gender})</small></h6>
                            <small class="text-muted">${m.email}</small>
                        </div>
                        <span class="badge bg-${color}">${m.score}% Match</span>
                    </div>
                </div>`;
        });

        resultsDiv.innerHTML = html || "<p class='text-center p-4'>Looking for compatible " + me.gender + " roommates...</p>";
        console.log("State-Space Recalculated! ⚡");
    });
}

// 6. AUTO-LOAD PROFILE ON LOGIN
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
            
            // Set Radio Buttons
            
            if (data.gender === "Female") document.getElementById('genFemale').checked = true;
            else document.getElementById('genMale').checked = true;
        }
    });
}

// Watch for auth changes
auth.onAuthStateChanged(user => { 
    if (user) {
        toggleView(true);
        loadMyProfile();
    } 
});

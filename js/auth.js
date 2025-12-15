// --- Configuration ---
// IMPORTANT: Change this URL to your actual GitHub Pages URL or raw file URL
// Example: 'https://username.github.io/repo-name/web/data/status.json'
const STATUS_URL = 'data/status.json'; // Relative for local/same-domain

// --- Encryption / Security (Client-Side) ---
const SECRET_KEY = "WHEELIE_LIFE_STATIC_SECURE";

function encrypt(text) {
    // Simple XOR for obfuscation (Not true security, but sufficient for this requirement)
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return btoa(result);
}

function decrypt(encoded) {
    try {
        let text = atob(encoded);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
        }
        return result;
    } catch (e) {
        return null;
    }
}

// --- User Management (LocalStorage) ---
const DB_KEY = 'wl_users_v1';
const SESSION_KEY = 'wl_session_v1';

function getUsers() {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
}

async function register(username, email, password) {
    const users = getUsers();
    
    if (users.find(u => u.username === username)) throw new Error("Username taken");
    if (users.find(u => u.email === email)) throw new Error("Email taken");
    
    const newUser = {
        id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        username,
        email,
        password: encrypt(password), // Obfuscate password
        role: username.toLowerCase() === 'admin' ? 'admin' : 'user',
        joinedAt: new Date().toISOString(),
        ip: '127.0.0.1' // Cannot get real IP in static site easily without external service
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Auto login
    login(username, password);
    
    return newUser;
}

async function login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) throw new Error("User not found");
    if (decrypt(user.password) !== password) throw new Error("Invalid password");
    
    // Create Session
    const session = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        loginTime: Date.now()
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

function getCurrentUser() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
}

// --- License / Token Generation ---
function generateLicenseToken() {
    const user = getCurrentUser();
    if (!user) return null;
    
    // Create a token that the game can verify
    // Format: JSON -> Encrypt -> Base64
    const tokenData = {
        uid: user.id,
        user: user.username,
        role: user.role,
        generated: Date.now()
    };
    
    return encrypt(JSON.stringify(tokenData));
}

// --- Admin / Status Check ---
async function checkBanStatus(userId) {
    try {
        const response = await fetch(STATUS_URL + '?t=' + Date.now()); // Prevent caching
        const data = await response.json();
        
        if (data.banned_users && data.banned_users.includes(userId)) {
            return { banned: true, reason: "Banned by Admin" };
        }
        return { banned: false };
    } catch (e) {
        console.error("Failed to check status", e);
        return { banned: false }; // Fail open or closed? Open for static site robustness
    }
}

// --- Analytics (Mock/Simple) ---
function trackVisit() {
    // In a real static site, use Google Analytics or similar.
    // Here we just increment a local counter for demo.
    let visits = parseInt(localStorage.getItem('site_visits') || '0');
    localStorage.setItem('site_visits', visits + 1);
}

trackVisit();

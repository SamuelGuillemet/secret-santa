// State
let participants = [];
let exclusionGroups = [];

// Seeded Random Number Generator (Mulberry32)
function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Fisher-Yates shuffle with seeded random
function shuffleArray(array, random) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate snowflakes
function createSnowflakes() {
    const container = document.getElementById('snowflakes');
    if (!container) return;

    const snowflakeChars = ['❄', '❅', '❆', '✻', '✼'];

    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (Math.random() * 3 + 5) + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowflake.style.fontSize = (Math.random() * 1 + 0.5) + 'em';
        container.appendChild(snowflake);
    }
}

// Generate random seed
function generateRandomSeed() {
    document.getElementById('seed').value = Math.floor(Math.random() * 1000000);
}

// Add participant
function addParticipant() {
    const input = document.getElementById('participantName');
    const name = input.value.trim();

    if (name && !participants.includes(name)) {
        participants.push(name);
        updateParticipantsList();
        updateExclusionCheckboxes();
        input.value = '';
    }
    input.focus();
}

function handleParticipantKeypress(event) {
    if (event.key === 'Enter') {
        addParticipant();
    }
}

// Remove participant
function removeParticipant(name) {
    participants = participants.filter(p => p !== name);
    // Also remove from exclusion groups
    exclusionGroups = exclusionGroups.map(group =>
        group.filter(member => member !== name)
    ).filter(group => group.length > 1);

    updateParticipantsList();
    updateExclusionCheckboxes();
    updateExclusionGroupsList();
}

// Update participants list display
function updateParticipantsList() {
    const container = document.getElementById('participantsList');
    if (!container) return;

    container.innerHTML = participants.map(name => `
        <div class="participant-tag">
            ${name}
            <span class="remove" onclick="removeParticipant('${name}')">✕</span>
        </div>
    `).join('');
}

// Update exclusion checkboxes
function updateExclusionCheckboxes() {
    const container = document.getElementById('exclusionCheckboxes');
    if (!container) return;

    if (participants.length === 0) {
        container.innerHTML = '<p style="color: #999;">Add participants first</p>';
        return;
    }

    container.innerHTML = participants.map(name => `
        <label class="checkbox-item">
            <input type="checkbox" value="${name}">
            ${name}
        </label>
    `).join('');
}

// Create exclusion group
function createExclusionGroup() {
    const checkboxes = document.querySelectorAll('#exclusionCheckboxes input[type="checkbox"]:checked');
    const selectedMembers = Array.from(checkboxes).map(cb => cb.value);

    if (selectedMembers.length < 2) {
        showError('Please select at least 2 people for an exclusion group');
        return;
    }

    exclusionGroups.push(selectedMembers);
    updateExclusionGroupsList();

    // Uncheck all
    checkboxes.forEach(cb => cb.checked = false);
}

// Remove exclusion group
function removeExclusionGroup(index) {
    exclusionGroups.splice(index, 1);
    updateExclusionGroupsList();
}

// Update exclusion groups display
function updateExclusionGroupsList() {
    const container = document.getElementById('exclusionGroupsList');
    if (!container) return;

    container.innerHTML = exclusionGroups.map((group, index) => `
        <div class="exclusion-group">
            <div class="exclusion-group-header">
                <h4>🚫 Exclusion Group ${index + 1}</h4>
                <button class="btn-danger" onclick="removeExclusionGroup(${index})">Remove</button>
            </div>
            <div class="exclusion-members">
                ${group.map(member => `<span class="exclusion-member">${member}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// Check if two people are in the same exclusion group
function areExcluded(person1, person2) {
    return exclusionGroups.some(group =>
        group.includes(person1) && group.includes(person2)
    );
}

// Check if assignment creates a 2-person loop
function createsShortLoop(assignments, giver, receiver) {
    // Check if receiver already gives to giver (A→B→A loop)
    return assignments[receiver] === giver;
}

// Generate valid assignments using backtracking
function generateValidAssignments(random) {
    const n = participants.length;
    const givers = shuffleArray([...participants], random);
    const receivers = shuffleArray([...participants], random);

    const assignments = {};
    const usedReceivers = new Set();

    function backtrack(giverIndex) {
        if (giverIndex === n) {
            return true; // All assigned successfully
        }

        const giver = givers[giverIndex];
        const shuffledReceivers = shuffleArray(receivers.filter(r => !usedReceivers.has(r)), random);

        for (const receiver of shuffledReceivers) {
            // Check constraints
            if (receiver === giver) continue; // Can't give to self
            if (areExcluded(giver, receiver)) continue; // Exclusion group
            if (createsShortLoop(assignments, giver, receiver)) continue; // No A→B→A

            // Try this assignment
            assignments[giver] = receiver;
            usedReceivers.add(receiver);

            if (backtrack(giverIndex + 1)) {
                return true;
            }

            // Backtrack
            delete assignments[giver];
            usedReceivers.delete(receiver);
        }

        return false;
    }

    if (backtrack(0)) {
        return assignments;
    }
    return null;
}

// Main generation function
function generateAssignments() {
    hideError();

    if (participants.length < 3) {
        showError('You need at least 3 participants for Secret Santa (to avoid 2-person loops)');
        return;
    }

    // Get or generate seed
    let seedInput = document.getElementById('seed').value;
    let seed;

    if (seedInput === '') {
        seed = Math.floor(Math.random() * 1000000);
        document.getElementById('seed').value = seed;
    } else {
        seed = parseInt(seedInput);
    }

    const random = mulberry32(seed);

    // Try to generate valid assignments
    const assignments = generateValidAssignments(random);

    if (!assignments) {
        showError('Unable to generate valid assignments with the current constraints. Try reducing exclusion groups or adding more participants.');
        return;
    }

    // Display results
    displayResults(assignments, seed);
}

// Display results
function displayResults(assignments, seed) {
    const resultsCard = document.getElementById('resultsCard');
    const assignmentsList = document.getElementById('assignmentsList');
    const seedInfo = document.getElementById('seedInfo');

    if (!resultsCard || !assignmentsList || !seedInfo) return;

    seedInfo.innerHTML = `<strong>🌱 Seed used:</strong> ${seed} (save this to reproduce the same results)`;

    assignmentsList.innerHTML = Object.entries(assignments).map(([giver, receiver]) => `
        <div class="assignment">
            <span class="giver">🎁 ${giver}</span>
            <span class="arrow">➜</span>
            <span class="receiver">${receiver} 🎄</span>
        </div>
    `).join('');

    // Draw graph
    drawGraph(assignments);

    // Update shareable URL and individual links
    updateUrlWithData(seed);
    generateIndividualLinks(assignments, seed);

    resultsCard.classList.add('show');
    resultsCard.scrollIntoView({ behavior: 'smooth' });
}

// Generate individual links for each participant
function generateIndividualLinks(assignments, seed) {
    const container = document.getElementById('individualLinksContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="individual-links">
            <h3>🔗 Individual Links (share privately with each person)</h3>
            <div class="individual-links-list">
                ${Object.keys(assignments).map(person => {
        const url = generateIndividualUrl(person, seed);
        return `<a href="${url}" class="individual-link" target="_blank">${person}</a>`;
    }).join('')}
            </div>
        </div>
    `;
}

// Generate URL for individual view
function generateIndividualUrl(person, seed) {
    const url = new URL(window.location.href.split('?')[0]);

    url.searchParams.set('participants', participants.map(p => encodeURIComponent(p)).join(','));

    if (exclusionGroups.length > 0) {
        const exclusionsStr = exclusionGroups.map(group =>
            group.map(m => encodeURIComponent(m)).join('|')
        ).join(',');
        url.searchParams.set('exclusions', exclusionsStr);
    }

    url.searchParams.set('seed', seed);
    url.searchParams.set('view', encodeURIComponent(person));

    return url.toString();
}

// Show error
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) return;

    errorDiv.textContent = '❌ ' + message;
    errorDiv.classList.add('show');
}

// Hide error
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.classList.remove('show');
    }
}

// Load data from query parameters
function loadFromQueryParams() {
    const params = new URLSearchParams(window.location.search);

    // Load participants
    const participantsParam = params.get('participants');
    if (participantsParam) {
        participants = participantsParam.split(',').map(p => decodeURIComponent(p.trim())).filter(p => p);
        updateParticipantsList();
        updateExclusionCheckboxes();
    }

    // Load exclusion groups (format: group1member1|group1member2,group2member1|group2member2)
    const exclusionsParam = params.get('exclusions');
    if (exclusionsParam) {
        exclusionGroups = exclusionsParam.split(',').map(group =>
            group.split('|').map(m => decodeURIComponent(m.trim())).filter(m => m)
        ).filter(group => group.length > 1);
        updateExclusionGroupsList();
    }

    // Load seed
    const seedParam = params.get('seed');
    if (seedParam) {
        const seedInput = document.getElementById('seed');
        if (seedInput) {
            seedInput.value = seedParam;
        }
    }

    // Check for individual view mode
    const viewPerson = params.get('view');
    if (viewPerson && participants.length >= 3 && seedParam) {
        showIndividualView(decodeURIComponent(viewPerson), parseInt(seedParam));
        return;
    }

    // Auto-generate if autorun parameter is set
    if (params.get('autorun') === 'true' && participants.length >= 3) {
        setTimeout(() => generateAssignments(), 500);
    }
}

// Show individual view for a specific person
function showIndividualView(person, seed) {
    const random = mulberry32(seed);
    const assignments = generateValidAssignments(random);

    // Generate backURL for main page witout view param
    const backUrl = new URL(window.location.href.split('?')[0]);
    if (participants.length > 0) {
        backUrl.searchParams.set('participants', participants.map(p => encodeURIComponent(p)).join(','));
    }
    if (exclusionGroups.length > 0) {
        const exclusionsStr = exclusionGroups.map(group =>
            group.map(m => encodeURIComponent(m)).join('|')
        ).join(',');
        backUrl.searchParams.set('exclusions', exclusionsStr);
    }
    backUrl.searchParams.set('seed', seed);
    backUrl.searchParams.delete('view');

    console.log(`To go back to main page: ${backUrl.toString()}`);

    if (!assignments || !assignments[person]) {
        document.body.innerHTML = `
            <div class="snowflakes" id="snowflakes"></div>
            <div class="container individual-view">
                <h1>🎅 Secret Santa</h1>
                <div class="card">
                    <h2>Error</h2>
                    <p style="color: #721c24;">Could not find assignment for "${person}". Please check the link.</p>
                    <a href="${window.location.href.split('?')[0]}" class="back-link">← Back to main page</a>
                </div>
            </div>
        `;
        createSnowflakes();
        return;
    }

    const receiver = assignments[person];

    document.body.innerHTML = `
        <div class="snowflakes" id="snowflakes"></div>
        <div class="container individual-view">
            <h1>🎅 Secret Santa</h1>
            <p class="subtitle">Your secret assignment is ready!</p>
            
            <div class="card">
                <h2>Your Assignment</h2>
                <div class="individual-result">
                    <div class="person-name">🎁 ${person}</div>
                    <div class="gift-icon">🎄✨🎁</div>
                    <div class="gives-to">You are giving a gift to...</div>
                    <div class="receiver-name">${receiver}</div>
                </div>
                <p style="color: #666; margin-top: 20px; font-style: italic;">
                    Remember: Keep it secret! 🤫
                </p>
            </div>
            
            <a href="${window.location.href.split('?')[0]}" class="back-link">← Back to main page</a>
        </div>
        <footer>
            <p>Made with ❤️ for the holiday season</p>
        </footer>
    `;

    createSnowflakes();
}

// Generate shareable URL
function generateShareUrl(seed) {
    const url = new URL(window.location.href.split('?')[0]);

    if (participants.length > 0) {
        url.searchParams.set('participants', participants.map(p => encodeURIComponent(p)).join(','));
    }

    if (exclusionGroups.length > 0) {
        const exclusionsStr = exclusionGroups.map(group =>
            group.map(m => encodeURIComponent(m)).join('|')
        ).join(',');
        url.searchParams.set('exclusions', exclusionsStr);
    }

    if (seed) {
        url.searchParams.set('seed', seed);
    }

    return url.toString();
}

// Update URL without reloading
function updateUrlWithData(seed) {
    const url = generateShareUrl(seed);
    window.history.replaceState({}, '', url);

    const shareInput = document.getElementById('shareUrl');
    if (shareInput) {
        shareInput.value = url + '&autorun=true';
    }
}

// Copy share URL to clipboard
function copyShareUrl() {
    const shareInput = document.getElementById('shareUrl');
    if (!shareInput) return;

    shareInput.select();
    document.execCommand('copy');

    // Show toast
    const toast = document.getElementById('copiedToast');
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
}

// Switch between list and graph view
function switchView(view) {
    const listView = document.getElementById('listView');
    const graphContainer = document.getElementById('graphContainer');
    const listBtn = document.getElementById('listViewBtn');
    const graphBtn = document.getElementById('graphViewBtn');

    if (!listView || !graphContainer || !listBtn || !graphBtn) return;

    if (view === 'list') {
        listView.classList.remove('hidden');
        graphContainer.classList.remove('show');
        listBtn.classList.add('active');
        graphBtn.classList.remove('active');
    } else {
        listView.classList.add('hidden');
        graphContainer.classList.add('show');
        listBtn.classList.remove('active');
        graphBtn.classList.add('active');
    }
}

// Draw graph visualization
function drawGraph(assignments) {
    const svg = document.getElementById('graphSvg');
    const container = document.getElementById('graphContainer');

    if (!svg || !container) return;

    // Clear previous content except defs
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    svg.appendChild(defs);

    const participantsList = Object.keys(assignments);
    const n = participantsList.length;

    // Calculate dimensions
    const width = 600;
    const height = Math.max(400, n * 50);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    container.style.minHeight = height + 'px';

    // Position nodes in a circle
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    const nodePositions = {};
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#43e97b', '#fa709a', '#fee140',
        '#30cfd0', '#c471ed', '#12c2e9', '#f64f59'
    ];

    participantsList.forEach((name, i) => {
        const angle = (2 * Math.PI * i / n) - Math.PI / 2;
        nodePositions[name] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
            color: colors[i % colors.length]
        };
    });

    // Draw edges (curved arrows)
    Object.entries(assignments).forEach(([giver, receiver]) => {
        const start = nodePositions[giver];
        const end = nodePositions[receiver];

        // Calculate control point for curved line
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Curve outward from center
        const curveOffset = dist * 0.2;
        const perpX = -dy / dist * curveOffset;
        const perpY = dx / dist * curveOffset;

        const ctrlX = midX + perpX;
        const ctrlY = midY + perpY;

        // Adjust start and end points to account for node radius
        const nodeRadius = 25;
        const startAngle = Math.atan2(ctrlY - start.y, ctrlX - start.x);
        const endAngle = Math.atan2(end.y - ctrlY, end.x - ctrlX);

        const adjustedStartX = start.x + nodeRadius * Math.cos(startAngle);
        const adjustedStartY = start.y + nodeRadius * Math.sin(startAngle);
        const adjustedEndX = end.x - (nodeRadius + 5) * Math.cos(endAngle);
        const adjustedEndY = end.y - (nodeRadius + 5) * Math.sin(endAngle);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${adjustedStartX} ${adjustedStartY} Q ${ctrlX} ${ctrlY} ${adjustedEndX} ${adjustedEndY}`);
        path.setAttribute('class', 'graph-edge');
        path.setAttribute('stroke', start.color);
        svg.appendChild(path);
    });

    // Draw nodes
    participantsList.forEach((name) => {
        const pos = nodePositions[name];

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'graph-node');
        group.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '25');
        circle.setAttribute('fill', pos.color);
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '3');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = name.length > 8 ? name.substring(0, 7) + '…' : name;

        group.appendChild(circle);
        group.appendChild(text);
        svg.appendChild(group);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    createSnowflakes();
    loadFromQueryParams();
});

const GITHUB_USER = 'FaR-Team';

const PROJECTS = [
    {
        id: 'farmoxel',
        name: 'Within Reach',
        repo: 'Project-FaR',
        icon: 'fas fa-tractor',
        description: 'A voxel-based farming simulator with unique gameplay mechanics.'
    },
    {
        id: 'roommakers',
        name: 'Room Makers',
        repo: 'RoomMakers-Android',
        icon: 'fas fa-couch',
        description: 'Design and organize your dream rooms in this interactive builder.'
    }
];

let currentProject = PROJECTS[0];

function initApp() {
    renderProjectSelector();
    loadProject(currentProject.id);
}

function renderProjectSelector() {
    const container = document.getElementById('project-selector');
    if (!container) return;

    container.innerHTML = PROJECTS.map(project => `
        <button class="project-tab ${project.id === currentProject.id ? 'active' : ''}" 
                onclick="switchProject('${project.id}')">
            <i class="${project.icon}"></i> ${project.name}
        </button>
    `).join('');
}

window.switchProject = function (projectId) {
    const newProject = PROJECTS.find(p => p.id === projectId);
    if (!newProject || newProject.id === currentProject.id) return;

    currentProject = newProject;

    renderProjectSelector();

    document.getElementById('total-downloads').textContent = '-';
    document.getElementById('version-count').textContent = '-';
    document.getElementById('latest-update').textContent = '-';

    loadProject(projectId);
};

async function loadProject(projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    const api_url = `https://api.github.com/repos/${GITHUB_USER}/${project.repo}/releases`;

    document.getElementById('latest-release-content').innerHTML =
        `<div class="loading">Loading latest ${project.name} build</div>`;
    document.getElementById('archive-content').innerHTML =
        `<div class="loading">Loading build archive</div>`;

    await fetchReleases(api_url);
}

async function fetchReleases(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        const releases = await response.json();

        releases.sort((a, b) => {
            const nameA = a.name || a.tag_name;
            const nameB = b.name || b.tag_name;

            const isAlphaA = nameA.toLowerCase().includes('alpha');
            const isAlphaB = nameB.toLowerCase().includes('alpha');
            const isBetaA = nameA.toLowerCase().includes('beta');
            const isBetaB = nameB.toLowerCase().includes('beta');

            if ((isAlphaA && isAlphaB) || (isBetaA && isBetaB)) {
                const versionA = extractVersionNumber(nameA);
                const versionB = extractVersionNumber(nameB);
                if (versionA !== null && versionB !== null) {
                    return compareVersions(versionB, versionA);
                }
                return new Date(b.published_at) - new Date(a.published_at);
            }

            if (isAlphaA && isBetaB) return 1;
            if (isBetaA && isAlphaB) return -1;

            if (isAlphaA) return 1;
            if (isAlphaB) return -1;

            return new Date(b.published_at) - new Date(a.published_at);
        });

        calculateStatistics(releases);
        displayLatestRelease(releases[0]);
        displayReleaseArchive(releases);
        setupVersionFilters(releases);

    } catch (error) {
        console.error('Error fetching releases:', error);
        document.getElementById('latest-release-content').innerHTML =
            `<div class="error"><i class="fas fa-exclamation-circle"></i> Failed to load releases. ${error.message}</div>`;
        document.getElementById('archive-content').innerHTML =
            `<div class="error"><i class="fas fa-exclamation-circle"></i> Failed to load releases. ${error.message}</div>`;
    }
}

function extractDateAndCleanName(releaseName) {
    const result = {
        name: releaseName,
        date: null
    };

    const dateMatch = releaseName.match(/\((\d{1,2}\/\d{1,2}\/\d{2,4})\)/);
    if (dateMatch && dateMatch[1]) {
        result.date = dateMatch[1];
        result.name = releaseName.replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{2,4}\)/, '').trim();
    }

    return result;
}

function extractVersionNumber(name) {
    const match = name.match(/(\d+(\.\d+)*)/);
    if (match && match[1]) {
        return match[1].split('.').map(part => parseInt(part, 10));
    }
    return null;
}

function compareVersions(versionA, versionB) {
    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
        const partA = i < versionA.length ? versionA[i] : 0;
        const partB = i < versionB.length ? versionB[i] : 0;

        if (partA > partB) return 1;
        if (partA < partB) return -1;
    }
    return 0;
}


function calculateStatistics(releases) {
    if (!releases || releases.length === 0) return;

    let totalDownloads = 0;
    releases.forEach(release => {
        if (release.assets && release.assets.length > 0) {
            release.assets.forEach(asset => {
                totalDownloads += asset.download_count;
            });
        }
    });

    const versionCount = releases.length;

    const latestDate = new Date(releases[0].published_at);
    const formattedDate = latestDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    document.getElementById('total-downloads').textContent = totalDownloads.toLocaleString();
    document.getElementById('version-count').textContent = versionCount;
    document.getElementById('latest-update').textContent = formattedDate;

    animateStatNumbers('total-downloads', totalDownloads);
    animateStatNumbers('version-count', versionCount);
}

function animateStatNumbers(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 1500;
    const startTime = performance.now();
    const startValue = 0;

    function updateNumber(currentTime) {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime < duration) {
            const progress = elapsedTime / duration;
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            const currentValue = Math.floor(startValue + easeProgress * (targetValue - startValue));
            element.textContent = currentValue.toLocaleString();
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = targetValue.toLocaleString();
        }
    }

    requestAnimationFrame(updateNumber);
}

function displayLatestRelease(release) {
    if (!release) {
        document.getElementById('latest-release-content').innerHTML =
            '<div class="error"><i class="fas fa-exclamation-circle"></i> No releases found.</div>';
        return;
    }

    const originalName = release.name || `v${release.tag_name}`;
    const { name: cleanName, date: extractedDate } = extractDateAndCleanName(originalName);

    const releaseDate = extractedDate || new Date(release.published_at).toLocaleDateString();

    let mainAsset = null;

    if (release.assets && release.assets.length > 0) {
        mainAsset = release.assets[0];

        for (const asset of release.assets) {
            if (asset.name.endsWith('.zip') || asset.name.endsWith('.exe') || asset.name.endsWith('.apk')) {
                mainAsset = asset;
                break;
            }
        }
    }

    let html = `
        <h3>${cleanName}</h3>
        <p><i class="far fa-calendar-alt"></i> Released on ${releaseDate}</p>
    `;

    if (mainAsset) {
        html += `
            <a href="${mainAsset.browser_download_url}" class="download-btn">
                <i class="fas fa-download"></i> Download ${mainAsset.name} (${formatFileSize(mainAsset.size)})
            </a>
        `;
    } else {
        html += '<p>No downloadable files found in this release.</p>';
    }

    if (release.body) {
        html += `
            <div class="release-notes">
                <h4><i class="fas fa-clipboard-list"></i> Release Notes:</h4>
                <p>${formatReleaseNotes(release.body)}</p>
            </div>
        `;
    }

    document.getElementById('latest-release-content').innerHTML = html;
}

function displayReleaseArchive(releases) {
    if (!releases || releases.length === 0) {
        document.getElementById('archive-content').innerHTML =
            '<div class="error"><i class="fas fa-exclamation-circle"></i> No releases found.</div>';
        return;
    }

    let html = '<ul class="release-list">';

    const startIndex = releases.length > 1 ? 1 : 0;

    for (let i = startIndex; i < releases.length; i++) {
        const release = releases[i];

        const originalName = release.name || `v${release.tag_name}`;
        const { name: cleanName, date: extractedDate } = extractDateAndCleanName(originalName);

        const releaseDate = extractedDate || new Date(release.published_at).toLocaleDateString();

        let mainAsset = null;
        if (release.assets && release.assets.length > 0) {
            mainAsset = release.assets[0];
        }

        html += `
            <li class="release-item">
                <div class="release-info">
                    <div class="release-title">${cleanName}</div>
                    <div class="release-date"><i class="far fa-calendar-alt"></i> ${releaseDate}</div>
                </div>
        `;

        if (mainAsset) {
            html += `
                <a href="${mainAsset.browser_download_url}" class="release-download">
                    <i class="fas fa-download"></i> Download ${formatFileSize(mainAsset.size)}
                </a>
            `;
        }

        html += '</li>';
    }

    html += '</ul>';
    document.getElementById('archive-content').innerHTML = html;
}


function setupVersionFilters(releases) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!filterButtons.length) return;

    filterButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });

    const newFilterButtons = document.querySelectorAll('.filter-btn');

    newFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            newFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.getAttribute('data-filter');

            let filteredReleases;
            if (filter === 'all') {
                filteredReleases = releases;
            } else {
                filteredReleases = releases.filter(release => {
                    const name = (release.name || release.tag_name).toLowerCase();
                    return name.includes(filter.toLowerCase());
                });
            }

            displayReleaseArchive(filteredReleases);
        });
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatReleaseNotes(notes) {
    if (!notes) return '';
    return notes
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>');
}

document.addEventListener('DOMContentLoaded', initApp);


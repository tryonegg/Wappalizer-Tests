const alphabet = 'abcdefghijklmnopqrstuvwxyz_';
const cache = {
    categories: null,
    technologies: null,
    categoryMap: {},
    impliedByMap: {} // New map to track reverse implications
};

async function initializeData() {
    // Load categories
    const catResponse = await fetch('technologies/categories.json');
    const categoriesData = await catResponse.json();
    
    // First convert to array of entries and sort by name property
    const sortedEntries = Object.entries(categoriesData)
        .sort((a, b) => {
            const nameA = a[1].name.toLowerCase();
            const nameB = b[1].name.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    // Convert back to object
    cache.categories = sortedEntries

    // Load all technology files at once
    cache.technologies = {};
    await Promise.all(alphabet.split('').map(async letter => {
        try {
            const response = await fetch(`technologies/${letter}.json`);
            const data = await response.json();
            cache.technologies[letter] = data;
            
            // Build category map and implications map
            Object.entries(data).forEach(([key, tech]) => {
                // Handle categories
                if (tech.cats) {
                    tech.cats.forEach(cat => {
                        if (!cache.categoryMap[cat]) {
                            cache.categoryMap[cat] = [];
                        }
                        cache.categoryMap[cat].push({
                            key: key,
                            ...tech
                        });
                    });
                }

                // Build reverse implications map
                if (tech.implies) {
                    const implies = Array.isArray(tech.implies) ? tech.implies : [tech.implies];
                    implies.forEach(impliedTech => {
                        if (!cache.impliedByMap[impliedTech]) {
                            cache.impliedByMap[impliedTech] = new Set();
                        }
                        cache.impliedByMap[impliedTech].add(key);
                    });
                }
            });
        } catch (error) {
            console.error(`Error loading ${letter}.json:`, error);
            cache.technologies[letter] = {};
        }
    }));

    // Sort technologies within each category by key
    Object.keys(cache.categoryMap).forEach(cat => {
        cache.categoryMap[cat].sort((a, b) => a.key.localeCompare(b.key));
    });

    displayCategories(cache.categories);
}

function displayCategories(categories) {
    const container = document.getElementById('categories');
    container.innerHTML = '<h2>Categories</h2>';
    
    const list = document.createElement('div');
    list.className = 'category-list';
    console.log('Categories:', categories);
    Object.entries(categories).forEach(([key, category]) => {
		key = category[0]
		category = category[1]; // Extract the category object from the array
		console.log(`Category: ${key}`, category);
        const count = cache.categoryMap[key]?.length || 0;
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `${category.name} (${count})`;
        
        item.addEventListener('click', () => showTechnologies(key, category.name));
        list.appendChild(item);
    });
    
    container.appendChild(list);
}

function findTechDetails(techKey) {
    // Search through all technology files for the matching key
    for (const letter in cache.technologies) {
        if (cache.technologies[letter][techKey]) {
            return {
                key: techKey,
                ...cache.technologies[letter][techKey]
            };
        }
    }
    return null;
}

function showTechnologies(category, categoryName) {
    const container = document.getElementById('technologies');
    container.innerHTML = `<h3>Technologies in ${categoryName}</h3>`;
    
    const technologies = cache.categoryMap[category] || [];
    
    if (technologies.length === 0) {
        container.innerHTML += '<p>No technologies found in this category.</p>';
        return;
    }
    
    const list = document.createElement('div');
    list.className = 'tech-list';

    const detailsContainer = document.createElement('div');
    detailsContainer.id = 'tech-details';
    
    technologies.forEach(tech => {
        const item = document.createElement('div');
        item.className = 'tech-item';

        // Name section
        const name = document.createElement('h4');
        name.className = 'tech-name';
        name.textContent = tech.key;
        item.appendChild(name);

        // URL section
        if (tech.website) {
            const urlDiv = document.createElement('div');
            urlDiv.className = 'tech-url';
            const link = document.createElement('a');
            link.href = tech.website;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = tech.website;
            urlDiv.appendChild(link);
            item.appendChild(urlDiv);
        }
	    
        // Description section
        if (tech.Description) {
            const desc = document.createElement('div');
            desc.className = 'tech-description';
            desc.textContent = tech.Description;
            item.appendChild(desc);
        }

        // Implies section
        if (tech.implies) {
            const implies = document.createElement('div');
            implies.className = 'tech-implies';
            implies.textContent = 'Implies: ';
            const impliedList = Array.isArray(tech.implies) ? tech.implies : [tech.implies];
            impliedList.forEach((impliedTech, index) => {
                const span = document.createElement('span');
                span.className = 'tech-link';
                span.textContent = impliedTech;
                span.addEventListener('click', () => {
                    const details = findTechDetails(impliedTech);
                    if (details) showTechDetails(details, detailsContainer);
                });
                implies.appendChild(span);
                if (index < impliedList.length - 1) {
                    implies.appendChild(document.createTextNode(', '));
                }
            });
            item.appendChild(implies);
        }

        // Implied by section
        const impliedBy = cache.impliedByMap[tech.key];
        if (impliedBy && impliedBy.size > 0) {
            const impliedByDiv = document.createElement('div');
            impliedByDiv.className = 'tech-implied-by';
            impliedByDiv.textContent = 'Implied by: ';
            Array.from(impliedBy).forEach((impliedByTech, index) => {
                const span = document.createElement('span');
                span.className = 'tech-link';
                span.textContent = impliedByTech;
                span.addEventListener('click', () => {
                    const details = findTechDetails(impliedByTech);
                    if (details) showTechDetails(details, detailsContainer);
                });
                impliedByDiv.appendChild(span);
                if (index < impliedBy.size - 1) {
                    impliedByDiv.appendChild(document.createTextNode(', '));
                }
            });
            item.appendChild(impliedByDiv);
        }

        // Technical details in code block
        const codeBlock = document.createElement('code');
        const technicalDetails = {};
        [
            'xhr',
            'dom',
            'html',
            'text',
            'scripts',
            'css',
            'robots',
            'magento',
            'meta',
            'headers',
            'dns',
            'certIssuer',
            'cookies',
            'scriptSrc',
            'js',
        ].forEach(field => {
            if (tech[field]) technicalDetails[field] = tech[field];
        });
        if (Object.keys(technicalDetails).length > 0) {
            codeBlock.textContent = JSON.stringify(technicalDetails, null, 2);
            item.appendChild(codeBlock);
        }

        list.appendChild(item);
    });
    
    container.appendChild(list);
    container.appendChild(detailsContainer);
}

function showTechDetails(tech, container) {
    container.innerHTML = `
        <div class="tech-details-popup">
            <h4>${tech.key}</h4>
            ${tech.Description ? `<p>${tech.Description}</p>` : ''}
            <code>${JSON.stringify(tech, null, 2)}</code>
        </div>
    `;
    container.scrollIntoView({ behavior: 'smooth' });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeData);

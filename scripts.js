// scripts.js - Calculateur des Coûts Cachés ERP - Gestion complète

// État global de l'application
const appState = {
    currentTab: 'tab-calcul',
    currentParamTab: 'param-erreurs',
    definitions: null,
    historique: [],
    statistiques: null,
    user: null,
    isAuthenticated: false,
    lastCalculation: null
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'application ERP Cost Calculator');
    initializeApp();
});

// Initialisation générale
function initializeApp() {
    checkAuthentication();
    setupEventListeners();
    animateEntrance();
    
    // Charger les données initiales si authentifié
    if (appState.isAuthenticated) {
        chargerDefinitions();
        chargerHistorique();
        chargerStatistiquesSecteur();
        chargerExemple('services'); // Charger un exemple par défaut
    }
}

// Vérification de l'authentification
async function checkAuthentication() {
    try {
        showLoading('Vérification de l\'authentification...');
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.authenticated) {
            appState.user = data.user;
            appState.isAuthenticated = true;
            showAuthenticatedUI();
            console.log('✅ Utilisateur authentifié:', data.user.nom_complet);
        } else {
            showUnauthenticatedUI();
            console.log('🔒 Utilisateur non authentifié');
        }
    } catch (error) {
        console.error('❌ Erreur vérification authentification:', error);
        showUnauthenticatedUI();
        showError('Erreur de connexion au serveur');
    } finally {
        hideLoading();
    }
}

// Affichage de l'interface pour utilisateur authentifié
function showAuthenticatedUI() {
    const userInfoBar = document.getElementById('user-info-bar');
    const calculatorContent = document.getElementById('calculator-content');
    const authRequired = document.getElementById('auth-required');
    const navAuthButtons = document.getElementById('nav-auth-buttons');
    
    if (userInfoBar) userInfoBar.classList.remove('hidden');
    if (calculatorContent) calculatorContent.classList.remove('hidden');
    if (authRequired) authRequired.classList.add('hidden');
    
    // Mettre à jour les informations utilisateur
    const userNameElement = document.getElementById('user-name');
    const userGreetingElement = document.getElementById('user-greeting');
    
    if (userNameElement) userNameElement.textContent = appState.user.nom_complet;
    if (userGreetingElement) {
        userGreetingElement.innerHTML = `Bienvenue, <strong>${appState.user.nom_complet}</strong>!`;
    }
    
    // Mettre à jour la navigation
    if (navAuthButtons) {
        navAuthButtons.innerHTML = `
            <span class="user-welcome">Bonjour, ${appState.user.nom_complet.split(' ')[0]}</span>
            <button class="btn-logout" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Déconnexion
            </button>
        `;
    }
    
    // Animation d'apparition
    setTimeout(() => {
        if (calculatorContent) {
            calculatorContent.style.opacity = '0';
            calculatorContent.style.transform = 'translateY(20px)';
            calculatorContent.style.transition = 'all 0.6s ease';
            calculatorContent.style.opacity = '1';
            calculatorContent.style.transform = 'translateY(0)';
        }
    }, 100);
}

// Affichage de l'interface pour utilisateur non authentifié
function showUnauthenticatedUI() {
    const userInfoBar = document.getElementById('user-info-bar');
    const calculatorContent = document.getElementById('calculator-content');
    const authRequired = document.getElementById('auth-required');
    
    if (userInfoBar) userInfoBar.classList.add('hidden');
    if (calculatorContent) calculatorContent.classList.add('hidden');
    if (authRequired) authRequired.classList.remove('hidden');
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Écouteurs pour la page d'inscription
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        setupSignupFormValidation();
    }
    
    // Écouteurs pour la page de connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Écouteurs pour le calculateur (si authentifié)
    if (appState.isAuthenticated) {
        setupCalculatorEventListeners();
    }
    
    // Écouteur pour le toggle du mot de passe
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', togglePasswordVisibility);
    });
    
    // Écouteur pour le menu mobile
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', toggleMobileMenu);
    }
    
    // Écouteur pour la fermeture du menu mobile en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        const navMenu = document.querySelector('.nav-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (navMenu && navMenu.classList.contains('active') && 
            !event.target.closest('.nav-menu') && 
            !event.target.closest('.nav-toggle')) {
            navMenu.classList.remove('active');
            if (mobileMenu) mobileMenu.classList.remove('active');
        }
    });
}

// Configuration des écouteurs pour le calculateur
function setupCalculatorEventListeners() {
    const form = document.querySelector('.form-grid');
    if (form) {
        form.addEventListener('input', debounce(validateForm, 300));
    }
    
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', formatNumberInput);
        input.addEventListener('blur', validateNumberInput);
    });
    
    const secteurSelect = document.getElementById('secteur');
    if (secteurSelect) {
        secteurSelect.addEventListener('change', adaptParamsToSecteur);
    }
    
    // Écouteur pour le champ chiffre d'affaires (formatage spécial)
    const chiffreAffairesInput = document.getElementById('chiffre_affaires');
    if (chiffreAffairesInput) {
        chiffreAffairesInput.addEventListener('input', formatChiffreAffaires);
        chiffreAffairesInput.addEventListener('blur', validateChiffreAffaires);
    }
}

// Gestion de l'inscription
async function handleSignup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        nom_complet: formData.get('nom_complet'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirm_password: formData.get('confirm_password')
    };
    
    // Validation côté client
    if (!validateSignupForm(data)) {
        return;
    }
    
    try {
        showLoading('Création de votre compte...');
        
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Compte créé avec succès! Redirection...');
            
            // Mettre à jour l'état et l'interface
            appState.user = result.user;
            appState.isAuthenticated = true;
            
            // Redirection vers la page principale après un délai
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Gestion de la connexion
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        showLoading('Connexion en cours...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Connexion réussie! Redirection...');
            
            // Mettre à jour l'état
            appState.user = result.user;
            appState.isAuthenticated = true;
            
            // Redirection vers la page principale après un délai
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Déconnexion
async function logout() {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        return;
    }
    
    try {
        showLoading('Déconnexion...');
        
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Déconnexion réussie');
            
            // Réinitialiser l'état
            appState.user = null;
            appState.isAuthenticated = false;
            appState.historique = [];
            appState.lastCalculation = null;
            
            // Redirection après un délai
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        showError('Erreur lors de la déconnexion');
    } finally {
        hideLoading();
    }
}

// Validation du formulaire d'inscription
function validateSignupForm(data) {
    let isValid = true;
    const errors = [];
    
    // Validation du nom complet
    if (!data.nom_complet || data.nom_complet.trim().length < 2) {
        errors.push('Le nom complet doit contenir au moins 2 caractères');
        isValid = false;
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.push('Format d\'email invalide');
        isValid = false;
    }
    
    // Validation du mot de passe
    if (!data.password || data.password.length < 8) {
        errors.push('Le mot de passe doit contenir au moins 8 caractères');
        isValid = false;
    }
    
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(data.password)) {
        errors.push('Le mot de passe doit contenir au moins une lettre et un chiffre');
        isValid = false;
    }
    
    if (data.password !== data.confirm_password) {
        errors.push('Les mots de passe ne correspondent pas');
        isValid = false;
    }
    
    if (!isValid) {
        showError(errors.join('<br>'));
    }
    
    return isValid;
}

// Configuration de la validation du formulaire d'inscription
function setupSignupFormValidation() {
    const form = document.getElementById('signup-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

// Validation d'un champ individuel
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    switch(field.name) {
        case 'nom_complet':
            if (value.length < 2) {
                isValid = false;
                message = 'Le nom doit contenir au moins 2 caractères';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                message = 'Format d\'email invalide';
            }
            break;
            
        case 'password':
            if (value.length < 8) {
                isValid = false;
                message = 'Le mot de passe doit contenir au moins 8 caractères';
            } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
                isValid = false;
                message = 'Doit contenir lettres et chiffres';
            }
            break;
            
        case 'confirm_password':
            const password = document.querySelector('input[name="password"]').value;
            if (value !== password) {
                isValid = false;
                message = 'Les mots de passe ne correspondent pas';
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(field, message);
    } else {
        clearFieldError(field);
        showFieldSuccess(field);
    }
    
    return isValid;
}

// Affichage d'erreur pour un champ
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error');
    field.classList.remove('success');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

// Affichage de succès pour un champ
function showFieldSuccess(field) {
    clearFieldError(field);
    field.classList.remove('error');
    field.classList.add('success');
}

// Suppression de l'erreur d'un champ
function clearFieldError(field) {
    field.classList.remove('error', 'success');
    
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
}

// Toggle de visibilité du mot de passe
function togglePasswordVisibility() {
    const passwordInput = this.parentNode.querySelector('input');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Toggle du menu mobile
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    this.classList.toggle('active');
    
    if (navMenu) {
        navMenu.classList.toggle('active');
        
        // Animation du menu
        if (navMenu.classList.contains('active')) {
            navMenu.style.display = 'flex';
            setTimeout(() => {
                navMenu.style.opacity = '1';
                navMenu.style.transform = 'translateY(0)';
            }, 10);
        } else {
            navMenu.style.opacity = '0';
            navMenu.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                navMenu.style.display = 'none';
            }, 300);
        }
    }
}

// Debounce pour optimiser les performances
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Animation d'entrée
function animateEntrance() {
    const elements = document.querySelectorAll('.form-section, .parametres-section, .tabs, .hero-content');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Gestion des onglets principaux
function openTab(tabName) {
    // Masquer tous les onglets
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    // Désactiver tous les boutons d'onglets
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    // Afficher l'onglet sélectionné
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Activer le bouton correspondant
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    // Mettre à jour l'état
    appState.currentTab = tabName;
    
    // Charger les données spécifiques à l'onglet
    switch(tabName) {
        case 'tab-statistiques':
            chargerStatistiquesSecteur();
            break;
        case 'tab-definitions':
            afficherDefinitions();
            break;
        case 'tab-historique':
            afficherHistorique();
            break;
    }
}

// Gestion des onglets de paramètres
function openParamTab(tabName) {
    // Masquer tous les contenus de paramètres
    const paramContents = document.getElementsByClassName('param-content');
    for (let i = 0; i < paramContents.length; i++) {
        paramContents[i].classList.remove('active');
    }
    
    // Désactiver tous les boutons de paramètres
    const paramTabs = document.getElementsByClassName('param-tab');
    for (let i = 0; i < paramTabs.length; i++) {
        paramTabs[i].classList.remove('active');
    }
    
    // Afficher le contenu sélectionné
    const targetParam = document.getElementById(tabName);
    if (targetParam) {
        targetParam.classList.add('active');
    }
    
    // Activer le bouton correspondant
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    // Mettre à jour l'état
    appState.currentParamTab = tabName;
}

// Chargement des définitions depuis l'API
async function chargerDefinitions() {
    if (!appState.isAuthenticated) return;
    
    try {
        showLoading('Chargement des définitions...');
        const response = await fetch('/api/couts/definitions');
        const data = await response.json();
        
        if (data.success) {
            appState.definitions = data;
            console.log('✅ Définitions chargées avec succès');
            afficherDefinitions();
        } else {
            throw new Error(data.error || 'Erreur lors du chargement des définitions');
        }
    } catch (error) {
        console.error('❌ Erreur chargement définitions:', error);
        showError('Erreur lors du chargement des définitions');
    } finally {
        hideLoading();
    }
}

// Affichage des définitions
function afficherDefinitions() {
    if (!appState.definitions) {
        chargerDefinitions();
        return;
    }
    
    const containers = {
        'definitions-erreurs': appState.definitions.couts_erreurs,
        'definitions-resistance': appState.definitions.couts_resistance,
        'definitions-imprevus': appState.definitions.couts_imprevus
    };
    
    for (const [containerId, definitions] of Object.entries(containers)) {
        const container = document.getElementById(containerId);
        if (container) {
            if (definitions && definitions.length > 0) {
                container.innerHTML = definitions.map(def => `
                    <div class="definition-item">
                        <h4><i class="fas fa-calculator"></i> ${def.nom}</h4>
                        <p>${def.description}</p>
                        <div class="definition-formule">
                            <strong>Formule:</strong> ${def.formule}
                        </div>
                        <div class="definition-unite">
                            <strong>Unité:</strong> ${def.unite}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p>Aucune définition disponible</p>';
            }
        }
    }
}

// Chargement des exemples d'entreprises
async function chargerExemple(type) {
    if (!appState.isAuthenticated) {
        showError('Veuillez vous connecter pour charger des exemples');
        return;
    }
    
    try {
        showLoading('Chargement de l\'exemple...');
        const response = await fetch('/api/entreprise/exemples');
        const data = await response.json();
        
        if (data.success && data.exemples) {
            let exemple;
            switch(type) {
                case 'industrie':
                    exemple = data.exemples.find(e => e.secteur === 'Industrie');
                    break;
                case 'services':
                    exemple = data.exemples.find(e => e.secteur === 'Services');
                    break;
                case 'distribution':
                    exemple = data.exemples.find(e => e.secteur === 'Distribution');
                    break;
                case 'textile':
                    exemple = data.exemples.find(e => e.secteur === 'Textile');
                    break;
                default:
                    exemple = data.exemples[0];
            }
            
            if (exemple) {
                // Remplir le formulaire avec l'exemple
                document.getElementById('nom_entreprise').value = exemple.nom;
                document.getElementById('secteur').value = exemple.secteur;
                document.getElementById('taille').value = exemple.taille;
                document.getElementById('chiffre_affaires').value = formatNumberInputValue(exemple.chiffre_affaires);
                document.getElementById('nombre_employes').value = exemple.nombre_employes;
                
                // Adapter les paramètres au secteur
                adaptParamsToSecteur();
                
                showSuccess(`Exemple ${exemple.secteur} chargé avec succès`);
            } else {
                throw new Error('Exemple non trouvé');
            }
        } else {
            throw new Error(data.error || 'Erreur lors du chargement des exemples');
        }
    } catch (error) {
        console.error('Erreur chargement exemple:', error);
        showError('Erreur lors du chargement de l\'exemple');
    } finally {
        hideLoading();
    }
}

// Adaptation des paramètres selon le secteur
function adaptParamsToSecteur() {
    const secteur = document.getElementById('secteur').value;
    const params = getSecteurParams(secteur);
    
    // Mettre à jour les paramètres par défaut
    for (const [key, value] of Object.entries(params)) {
        const element = document.querySelector(`[name="${key}"]`);
        if (element) {
            element.value = value;
            // Déclencher l'événement input pour le formatage
            const event = new Event('input');
            element.dispatchEvent(event);
        }
    }
}

// Paramètres par défaut selon le secteur
function getSecteurParams(secteur) {
    const params = {
        'industrie': {
            'delai_prevue_mois': 10,
            'delai_reel_mois': 15,
            'cout_jour_homme': 1000,
            'heures_correction': 300,
            'heures_configuration': 150,
            'taux_horaire_developpeur': 200,
            'taux_baisse_productivite': 20,
            'salaire_moyen_mensuel': 9000,
            'duree_adaptation_mois': 4,
            'nombre_departs': 8,
            'heures_support': 400,
            'taux_horaire_support': 120,
            'heures_retravail': 400,
            'heures_integration': 500,
            'cout_maintenance_annuel': 150000,
            'taux_maintenance_imprevu': 25,
            'heures_adaptation': 250,
            'taux_horaire_expert': 300
        },
        'services': {
            'delai_prevue_mois': 8,
            'delai_reel_mois': 12,
            'cout_jour_homme': 800,
            'heures_correction': 200,
            'heures_configuration': 100,
            'taux_horaire_developpeur': 200,
            'taux_baisse_productivite': 15,
            'salaire_moyen_mensuel': 8000,
            'duree_adaptation_mois': 3,
            'nombre_departs': 5,
            'heures_support': 300,
            'taux_horaire_support': 100,
            'heures_retravail': 300,
            'heures_integration': 400,
            'cout_maintenance_annuel': 100000,
            'taux_maintenance_imprevu': 20,
            'heures_adaptation': 200,
            'taux_horaire_expert': 250
        },
        'distribution': {
            'delai_prevue_mois': 9,
            'delai_reel_mois': 14,
            'cout_jour_homme': 900,
            'heures_correction': 250,
            'heures_configuration': 120,
            'taux_horaire_developpeur': 200,
            'taux_baisse_productivite': 18,
            'salaire_moyen_mensuel': 7500,
            'duree_adaptation_mois': 3,
            'nombre_departs': 6,
            'heures_support': 350,
            'taux_horaire_support': 110,
            'heures_retravail': 350,
            'heures_integration': 450,
            'cout_maintenance_annuel': 120000,
            'taux_maintenance_imprevu': 22,
            'heures_adaptation': 220,
            'taux_horaire_expert': 280
        },
        'textile': {
            'delai_prevue_mois': 11,
            'delai_reel_mois': 16,
            'cout_jour_homme': 950,
            'heures_correction': 350,
            'heures_configuration': 180,
            'taux_horaire_developpeur': 220,
            'taux_baisse_productivite': 22,
            'salaire_moyen_mensuel': 6500,
            'duree_adaptation_mois': 5,
            'nombre_departs': 10,
            'heures_support': 450,
            'taux_horaire_support': 130,
            'heures_retravail': 450,
            'heures_integration': 550,
            'cout_maintenance_annuel': 180000,
            'taux_maintenance_imprevu': 28,
            'heures_adaptation': 280,
            'taux_horaire_expert': 320
        }
    };
    
    return params[secteur.toLowerCase()] || params['services'];
}

// Validation du formulaire
function validateForm() {
    const requiredFields = document.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#fa709a';
        } else {
            field.style.borderColor = '#e2e8f0';
        }
    });
    
    return isValid;
}

// Formatage des entrées numériques
function formatNumberInput(event) {
    const input = event.target;
    let value = input.value.replace(/[^\d]/g, '');
    
    if (value) {
        // Formater avec séparateurs de milliers
        value = parseInt(value).toLocaleString('fr-FR');
    }
    
    input.value = value;
}

// Formatage spécial pour le chiffre d'affaires
function formatChiffreAffaires(event) {
    const input = event.target;
    let value = input.value.replace(/[^\d]/g, '');
    
    if (value) {
        // Formater avec séparateurs de milliers
        value = parseInt(value).toLocaleString('fr-FR');
    }
    
    input.value = value;
}

// Validation du chiffre d'affaires
function validateChiffreAffaires(event) {
    const input = event.target;
    const value = input.value.replace(/[^\d]/g, '');
    
    if (!value || parseInt(value) <= 0) {
        input.style.borderColor = '#fa709a';
        showError('Le chiffre d\'affaires doit être positif');
    } else {
        input.style.borderColor = '#43e97b';
    }
}

// Formatage des valeurs numériques (pour l'initialisation)
function formatNumberInputValue(value) {
    return value.toLocaleString('fr-FR');
}

// Validation des entrées numériques
function validateNumberInput(event) {
    const input = event.target;
    const value = input.value.replace(/[^\d]/g, '');
    
    if (!value || parseInt(value) <= 0) {
        input.style.borderColor = '#fa709a';
        showError(`La valeur de ${input.previousElementSibling?.textContent || 'ce champ'} doit être positive`);
    } else {
        input.style.borderColor = '#43e97b';
    }
}

// Calcul principal des coûts
async function calculerCouts() {
    if (!appState.isAuthenticated) {
        showError('Veuillez vous connecter pour utiliser le calculateur');
        openTab('tab-calcul');
        return;
    }
    
    if (!validateForm()) {
        showError('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    try {
        showLoading('Calcul des coûts en cours...');
        
        // Récupérer les données du formulaire
        const formData = getFormData();
        
        // Appel à l'API
        const response = await fetch('/api/couts/calculer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            appState.lastCalculation = data.resultats;
            afficherResultats(data.resultats);
            chargerRecommandations(data.resultats);
            chargerHistorique(); // Recharger l'historique
            showSuccess('Calcul effectué avec succès !');
        } else {
            throw new Error(data.error || 'Erreur lors du calcul');
        }
        
    } catch (error) {
        console.error('❌ Erreur calcul:', error);
        showError('Erreur lors du calcul des coûts: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Récupération des données du formulaire
function getFormData() {
    // Récupérer les valeurs numériques en nettoyant les séparateurs
    const getNumericValue = (id) => {
        const element = document.getElementById(id);
        return element ? parseInt(element.value.replace(/[^\d]/g, '')) || 0 : 0;
    };
    
    const entrepriseData = {
        nom_entreprise: document.getElementById('nom_entreprise').value,
        secteur: document.getElementById('secteur').value,
        taille: document.getElementById('taille').value,
        chiffre_affaires: getNumericValue('chiffre_affaires'),
        nombre_employes: getNumericValue('nombre_employes')
    };
    
    const parametres = {
        // Erreurs
        delai_prevue_mois: getNumericValue('delai_prevue_mois'),
        delai_reel_mois: getNumericValue('delai_reel_mois'),
        cout_jour_homme: getNumericValue('cout_jour_homme'),
        heures_correction: getNumericValue('heures_correction'),
        heures_configuration: getNumericValue('heures_configuration'),
        taux_horaire_developpeur: getNumericValue('taux_horaire_developpeur'),
        taux_horaire_technicien: 150,
        
        // Résistance
        taux_baisse_productivite: getNumericValue('taux_baisse_productivite'),
        salaire_moyen_mensuel: getNumericValue('salaire_moyen_mensuel'),
        duree_adaptation_mois: getNumericValue('duree_adaptation_mois'),
        nombre_departs: getNumericValue('nombre_departs'),
        heures_support: getNumericValue('heures_support'),
        taux_horaire_support: getNumericValue('taux_horaire_support'),
        cout_embauche_par_personne: 10000,
        cout_formation_nouvel_employe: 5000,
        taux_horaire_moyen: 50,
        heures_inefficacite: 500,
        
        // Imprévus
        heures_retravail: getNumericValue('heures_retravail'),
        heures_integration: getNumericValue('heures_integration'),
        cout_maintenance_annuel: getNumericValue('cout_maintenance_annuel'),
        taux_maintenance_imprevu: getNumericValue('taux_maintenance_imprevu'),
        heures_adaptation: getNumericValue('heures_adaptation'),
        taux_horaire_expert: getNumericValue('taux_horaire_expert')
    };
    
    return {
        ...entrepriseData,
        parametres: parametres
    };
}

// Affichage des résultats
function afficherResultats(resultats) {
    const section = document.getElementById('resultats-section');
    if (!section) return;
    
    section.classList.remove('hidden');
    
    // Animation d'apparition
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        section.style.transition = 'all 0.6s ease';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    }, 100);
    
    // Mettre à jour les totaux
    document.getElementById('total-general').textContent = formatMontant(resultats.total_general);
    document.getElementById('total-erreurs').textContent = formatMontant(resultats.couts_erreurs.total_erreurs);
    document.getElementById('total-resistance').textContent = formatMontant(resultats.couts_resistance.total_resistance);
    document.getElementById('total-imprevus').textContent = formatMontant(resultats.couts_imprevus.total_imprevus);
    document.getElementById('pourcentage-ca').textContent = `${resultats.pourcentage_ca.toFixed(2)}% du CA`;
    
    // Afficher les détails
    afficherDetailsCouts('details-erreurs', resultats.couts_erreurs);
    afficherDetailsCouts('details-resistance', resultats.couts_resistance);
    afficherDetailsCouts('details-imprevus', resultats.couts_imprevus);
    
    // Scroll vers les résultats
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Affichage des détails des coûts
function afficherDetailsCouts(containerId, coutsData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const items = [];
    
    for (const [key, value] of Object.entries(coutsData)) {
        if (key.startsWith('total_')) continue;
        
        if (value && typeof value === 'object' && value.valeur !== undefined) {
            items.push(`
                <div class="details-item">
                    <span>${value.description || key}</span>
                    <span>${formatMontant(value.valeur)}</span>
                </div>
            `);
        }
    }
    
    container.innerHTML = items.join('') || '<div class="details-item"><span>Aucun détail disponible</span><span>0 MAD</span></div>';
}

// Chargement des recommandations
async function chargerRecommandations(resultats) {
    try {
        const response = await fetch('/api/recommandations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resultats: resultats })
        });
        
        const data = await response.json();
        
        if (data.success) {
            afficherRecommandations(data.recommandations, data.categorie_principale);
        }
    } catch (error) {
        console.error('Erreur chargement recommandations:', error);
    }
}

// Affichage des recommandations
function afficherRecommandations(recommandations, categoriePrincipale) {
    const container = document.getElementById('recommandations-list');
    if (!container) return;
    
    if (recommandations && recommandations.length > 0) {
        container.innerHTML = recommandations.map(rec => `
            <div class="recommandation-item">
                <i class="fas fa-lightbulb"></i>
                <span>${rec}</span>
            </div>
        `).join('');
        
        // Mettre à jour le titre avec la catégorie principale
        const titre = document.querySelector('.recommandations-section h4');
        if (titre && categoriePrincipale) {
            titre.innerHTML = `<i class="fas fa-lightbulb"></i> Recommandations - Priorité: ${categoriePrincipale}`;
        }
    } else {
        container.innerHTML = '<div class="recommandation-item"><i class="fas fa-lightbulb"></i><span>Aucune recommandation spécifique</span></div>';
    }
}

// Formatage des montants
function formatMontant(montant) {
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(montant);
}

// Génération de rapport PDF
async function genererRapport() {
    if (!appState.isAuthenticated) {
        showError('Veuillez vous connecter pour générer un rapport');
        return;
    }
    
    if (!appState.lastCalculation) {
        showError('Veuillez d\'abord effectuer un calcul');
        return;
    }
    
    try {
        showLoading('Génération du rapport...');
        
        const response = await fetch('/api/rapport/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resultats: appState.lastCalculation
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Rapport généré avec succès !');
            
            // Simulation de téléchargement
            simulerTelechargementRapport(data.rapport);
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Erreur génération rapport:', error);
        showError('Erreur lors de la génération du rapport');
    } finally {
        hideLoading();
    }
}

// Simulation de téléchargement du rapport
function simulerTelechargementRapport(rapport) {
    // Créer un contenu HTML pour le rapport
    const contenuRapport = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${rapport.titre}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px; }
                .section { margin: 20px 0; }
                .montant { font-weight: bold; color: #10B981; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f0fdf4; }
            </style>
        </head>
        <body>
            <h1>${rapport.titre}</h1>
            <p><strong>Date de génération:</strong> ${rapport.date_generation}</p>
            <p><strong>Généré par:</strong> ${rapport.utilisateur}</p>
            
            <div class="section">
                <h2>Résumé des Coûts</h2>
                <table>
                    <tr><th>Catégorie</th><th>Montant</th></tr>
                    <tr><td>Coûts des Erreurs</td><td class="montant">${formatMontant(rapport.resume.total_erreurs)}</td></tr>
                    <tr><td>Coûts de Résistance</td><td class="montant">${formatMontant(rapport.resume.total_resistance)}</td></tr>
                    <tr><td>Coûts Imprévus</td><td class="montant">${formatMontant(rapport.resume.total_imprevus)}</td></tr>
                    <tr><td><strong>Total Général</strong></td><td class="montant"><strong>${formatMontant(rapport.resume.total_general)}</strong></td></tr>
                </table>
                <p><strong>Pourcentage du CA:</strong> ${rapport.resume.pourcentage_ca.toFixed(2)}%</p>
            </div>
            
            <div class="section">
                <p><em>Ceci est une simulation de rapport. En production, un vrai PDF serait généré.</em></p>
            </div>
        </body>
        </html>
    `;
    
    // Ouvrir dans une nouvelle fenêtre pour "simuler" le téléchargement
    const fenetreRapport = window.open('', '_blank');
    fenetreRapport.document.write(contenuRapport);
    fenetreRapport.document.close();
}

// Chargement des statistiques par secteur
async function chargerStatistiquesSecteur() {
    try {
        const secteurSelect = document.getElementById('secteur-statistiques');
        const secteur = secteurSelect ? secteurSelect.value : 'Tous';
        
        showLoading('Chargement des statistiques...');
        
        const response = await fetch('/api/statistiques/secteur', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ secteur: secteur })
        });
        
        const data = await response.json();
        
        if (data.success) {
            afficherStatistiques(data.statistiques, data.secteur);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
        showError('Erreur lors du chargement des statistiques');
    } finally {
        hideLoading();
    }
}

// Affichage des statistiques
function afficherStatistiques(stats, secteur) {
    const container = document.getElementById('statistiques-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="statistiques-header">
            <h3>Statistiques pour le secteur: ${secteur}</h3>
            <p>Basé sur ${stats.nombre_implementations} implémentations analysées - Taux de réussite: ${stats.taux_reussite}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Coûts Moyens des Erreurs</h4>
                <div class="stat-value">${formatMontant(stats.couts_moyens_erreurs)}</div>
            </div>
            
            <div class="stat-card">
                <h4>Coûts Moyens de Résistance</h4>
                <div class="stat-value">${formatMontant(stats.couts_moyens_resistance)}</div>
            </div>
            
            <div class="stat-card">
                <h4>Coûts Moyens Imprévus</h4>
                <div class="stat-value">${formatMontant(stats.couts_moyens_imprevus)}</div>
            </div>
            
            <div class="stat-card total">
                <h4>Total Moyen</h4>
                <div class="stat-value">${formatMontant(stats.total_moyen)}</div>
            </div>
        </div>
        
        <div class="stats-comparaison">
            <h4>Répartition Moyenne des Coûts</h4>
            <div class="repartition-chart">
                <div class="chart-bar erreurs" style="width: ${(stats.couts_moyens_erreurs / stats.total_moyen * 100)}%">
                    <span>Erreurs: ${(stats.couts_moyens_erreurs / stats.total_moyen * 100).toFixed(1)}%</span>
                </div>
                <div class="chart-bar resistance" style="width: ${(stats.couts_moyens_resistance / stats.total_moyen * 100)}%">
                    <span>Résistance: ${(stats.couts_moyens_resistance / stats.total_moyen * 100).toFixed(1)}%</span>
                </div>
                <div class="chart-bar imprevus" style="width: ${(stats.couts_moyens_imprevus / stats.total_moyen * 100)}%">
                    <span>Imprévus: ${(stats.couts_moyens_imprevus / stats.total_moyen * 100).toFixed(1)}%</span>
                </div>
            </div>
        </div>
        
        <div class="stats-insights">
            <h4>Analyse du Secteur</h4>
            <p>Les entreprises du secteur ${secteur} rencontrent en moyenne des coûts cachés représentant environ ${(stats.total_moyen / 1000000).toFixed(1)} millions de MAD lors de l'implémentation d'un ERP.</p>
            <p>Le taux de réussite de ${stats.taux_reussite} indique que la majorité des projets aboutissent avec succès malgré ces coûts.</p>
        </div>
    `;
}

// Chargement de l'historique
async function chargerHistorique() {
    if (!appState.isAuthenticated) return;
    
    try {
        const response = await fetch('/api/historique');
        const data = await response.json();
        
        if (data.success) {
            appState.historique = data.historique;
            afficherHistorique();
        }
    } catch (error) {
        console.error('Erreur chargement historique:', error);
    }
}

// Affichage de l'historique
function afficherHistorique() {
    const container = document.getElementById('historique-content');
    if (!container) return;
    
    if (!appState.historique || appState.historique.length === 0) {
        container.innerHTML = `
            <div class="historique-vide">
                <i class="fas fa-history"></i>
                <p>Aucun calcul dans l'historique</p>
                <p class="historique-subtitle">Effectuez votre premier calcul pour le voir apparaître ici</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.historique.map(item => `
        <div class="historique-item">
            <div class="historique-info">
                <strong>${item.entreprise.nom}</strong>
                <span>${item.entreprise.secteur} - ${item.entreprise.taille}</span>
            </div>
            <div class="historique-montant">
                ${formatMontant(item.total_general)}
            </div>
            <div class="historique-date">
                ${new Date(item.timestamp).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
        </div>
    `).join('');
}

// Affichage de la comparaison avec le secteur
function afficherComparaisonSecteur() {
    openTab('tab-statistiques');
}

// Réinitialisation du formulaire
function reinitialiserFormulaire() {
    if (confirm('Voulez-vous vraiment réinitialiser le formulaire ? Toutes les données saisies seront perdues.')) {
        const form = document.querySelector('form');
        if (form) {
            form.reset();
        }
        
        const resultatsSection = document.getElementById('resultats-section');
        if (resultatsSection) {
            resultatsSection.classList.add('hidden');
        }
        
        // Réinitialiser les styles des champs
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.style.borderColor = '';
            clearFieldError(input);
        });
        
        showSuccess('Formulaire réinitialisé');
    }
}

// Gestion du loading
function showLoading(message = 'Chargement en cours...') {
    const loading = document.getElementById('loading');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
    
    if (loading) {
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

// Gestion des notifications
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Styles pour la notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#10B981' : 
                   type === 'error' ? '#EF4444' : '#3B82F6',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '400px',
        minWidth: '300px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: '500'
    });
    
    // Style du bouton de fermeture
    const closeButton = notification.querySelector('button');
    Object.assign(closeButton.style, {
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        marginLeft: 'auto'
    });
    
    closeButton.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.2)';
    });
    
    closeButton.addEventListener('mouseleave', function() {
        this.style.background = 'none';
    });
    
    document.body.appendChild(notification);
    
    // Suppression automatique après 5 secondes
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Remplir automatiquement les identifiants de démo (pour la page login)
function fillDemoCredentials() {
    document.getElementById('email').value = 'demo@erp.ma';
    document.getElementById('password').value = 'demo123';
    showSuccess('Identifiants de démo remplis ! Cliquez sur "Sign In" pour continuer.');
}

// Connexions sociales (simulation)
function signupWithGoogle() {
    showInfo('Inscription avec Google - Fonctionnalité à venir');
}

function signupWithFacebook() {
    showInfo('Inscription avec Facebook - Fonctionnalité à venir');
}

function signupWithLinkedIn() {
    showInfo('Inscription avec LinkedIn - Fonctionnalité à venir');
}

function loginWithGoogle() {
    showInfo('Connexion avec Google - Fonctionnalité à venir');
}

function loginWithFacebook() {
    showInfo('Connexion avec Facebook - Fonctionnalité à venir');
}

function loginWithLinkedIn() {
    showInfo('Connexion avec LinkedIn - Fonctionnalité à venir');
}

// Exportation des fonctions globales
window.openTab = openTab;
window.openParamTab = openParamTab;
window.calculerCouts = calculerCouts;
window.genererRapport = genererRapport;
window.afficherComparaisonSecteur = afficherComparaisonSecteur;
window.reinitialiserFormulaire = reinitialiserFormulaire;
window.chargerExemple = chargerExemple;
window.chargerStatistiquesSecteur = chargerStatistiquesSecteur;
window.logout = logout;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleMobileMenu = toggleMobileMenu;
window.fillDemoCredentials = fillDemoCredentials;
window.signupWithGoogle = signupWithGoogle;
window.signupWithFacebook = signupWithFacebook;
window.signupWithLinkedIn = signupWithLinkedIn;
window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;
window.loginWithLinkedIn = loginWithLinkedIn;

// Animation CSS pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .historique-vide {
        text-align: center;
        padding: 3rem;
        color: #718096;
    }
    
    .historique-vide i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .historique-subtitle {
        font-size: 0.875rem;
        margin-top: 0.5rem;
        opacity: 0.7;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }
    
    .stat-card {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 12px;
        text-align: center;
        border-left: 4px solid #10B981;
    }
    
    .stat-card.total {
        border-left-color: #10B981;
        background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
        color: white;
    }
    
    .stat-value {
        font-size: 1.5rem;
        font-weight: bold;
        margin-top: 0.5rem;
    }
    
    .repartition-chart {
        display: flex;
        height: 40px;
        border-radius: 8px;
        overflow: hidden;
        margin: 1rem 0;
    }
    
    .chart-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 0.875rem;
        transition: all 0.3s ease;
    }
    
    .chart-bar.erreurs { background: linear-gradient(135deg, #EF4444 0%, #F59E0B 100%); }
    .chart-bar.resistance { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); }
    .chart-bar.imprevus { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); }
    
    .chart-bar:hover {
        transform: scale(1.05);
    }
    
    .stats-insights {
        background: #f0fdf4;
        padding: 1.5rem;
        border-radius: 12px;
        border-left: 4px solid #10B981;
        margin-top: 2rem;
    }
    
    .stats-insights h4 {
        color: #065f46;
        margin-bottom: 1rem;
    }
    
    .stats-insights p {
        color: #047857;
        margin-bottom: 0.5rem;
        line-height: 1.5;
    }
    
    /* Styles pour le menu mobile */
    .nav-menu {
        transition: all 0.3s ease;
    }
    
    .nav-menu.active {
        display: flex !important;
        opacity: 1;
        transform: translateY(0);
    }
    
    .user-welcome {
        color: #10B981;
        font-weight: 600;
        margin-right: 1rem;
    }
    
    /* Responsive pour les notifications */
    @media (max-width: 480px) {
        .notification {
            min-width: unset !important;
            max-width: 90% !important;
            right: 5% !important;
            left: 5% !important;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ scripts.js chargé avec succès - ERP Cost Calculator Ready!');
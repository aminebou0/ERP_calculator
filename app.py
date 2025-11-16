from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_session import Session
import json
import math
import datetime
from dataclasses import dataclass
from typing import Dict, List, Optional
import os
import hashlib
import re

app = Flask(__name__)
app.secret_key = 'erp_cost_calculator_maroc_2024_secret_key_secure_123'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=1)
Session(app)

# Modèle de données pour les utilisateurs
class User:
    def __init__(self, id, nom_complet, email, password_hash):
        self.id = id
        self.nom_complet = nom_complet
        self.email = email
        self.password_hash = password_hash
        self.date_creation = datetime.datetime.now()
        self.derniere_connexion = datetime.datetime.now()

# Base de données simulée (en production, utiliser PostgreSQL/MySQL)
users_db = {
    'admin@erp.ma': User(
        'admin123', 
        'Administrateur ERP', 
        'admin@erp.ma', 
        hashlib.sha256('admin123'.encode()).hexdigest()
    )
}

@dataclass
class CoutCache:
    nom: str
    description: str
    formule_calcul: str
    unite: str

@dataclass
class Entreprise:
    nom: str
    secteur: str
    taille: str
    chiffre_affaires: float
    nombre_employes: int

class CalculateurCoutsERP:
    def __init__(self):
        self.couts_erreurs = self._initialiser_couts_erreurs()
        self.couts_resistance = self._initialiser_couts_resistance()
        self.couts_imprevus = self._initialiser_couts_imprevus()
    
    def _initialiser_couts_erreurs(self) -> List[CoutCache]:
        return [
            CoutCache(
                "Erreurs de planification",
                "Dépassement des délais et budget initial dû à une mauvaise estimation",
                "cout_planification = (delai_reel - delai_prevue) * cout_jour_homme * 22",
                "MAD"
            ),
            CoutCache(
                "Erreurs techniques",
                "Corrections de bugs, problèmes de configuration et ajustements techniques",
                "cout_technique = heures_correction * taux_horaire_technicien",
                "MAD"
            ),
            CoutCache(
                "Formation inadéquate",
                "Formation supplémentaire nécessaire suite à un mauvais planning initial",
                "cout_formation = nombre_personnes * duree_formation * cout_formation_par_jour",
                "MAD"
            ),
            CoutCache(
                "Configuration personnalisée",
                "Développements spécifiques non prévus initialement",
                "cout_configuration = heures_configuration * taux_horaire_developpeur",
                "MAD"
            )
        ]
    
    def _initialiser_couts_resistance(self) -> List[CoutCache]:
        return [
            CoutCache(
                "Baisse de productivité",
                "Réduction temporaire de l'efficacité des employés pendant la période d'adaptation",
                "cout_productivite = (taux_baisse_productivite / 100) * salaire_moyen_mensuel * nombre_employes * duree_mois",
                "MAD"
            ),
            CoutCache(
                "Turnover accru",
                "Départ d'employés ne s'adaptant pas au nouveau système",
                "cout_turnover = nombre_departs * (cout_embauche + cout_formation_nouvel_employe)",
                "MAD"
            ),
            CoutCache(
                "Résistance passive",
                "Temps perdu en résistance au changement et non-utilisation optimale",
                "cout_resistance = heures_inefficacite * taux_horaire_moyen",
                "MAD"
            ),
            CoutCache(
                "Support supplémentaire",
                "Besoin accru en support technique et fonctionnel pendant la transition",
                "cout_support = heures_support * taux_horaire_support",
                "MAD"
            )
        ]
    
    def _initialiser_couts_imprevus(self) -> List[CoutCache]:
        return [
            CoutCache(
                "Imprévus organisationnels",
                "Changements non prévus dans les processus métier",
                "cout_organisationnel = heures_retravail * taux_horaire_moyen",
                "MAD"
            ),
            CoutCache(
                "Problèmes de compatibilité",
                "Intégration complexe avec systèmes existants",
                "cout_compatibilite = heures_integration * taux_horaire_technicien",
                "MAD"
            ),
            CoutCache(
                "Coûts de maintenance imprévus",
                "Maintenance corrective et évolutive non prévue au budget",
                "cout_maintenance = cout_maintenance_annuel * (taux_imprevu / 100)",
                "MAD"
            ),
            CoutCache(
                "Évolutions réglementaires",
                "Adaptations nécessaires suite à des changements réglementaires",
                "cout_reglementaire = heures_adaptation * taux_horaire_expert",
                "MAD"
            )
        ]
    
    def calculer_couts_erreurs(self, parametres: Dict) -> Dict:
        couts = {}
        
        try:
            # Erreurs de planification
            delai_reel = parametres.get('delai_reel_mois', 12)
            delai_prevue = parametres.get('delai_prevue_mois', 8)
            cout_jour_homme = parametres.get('cout_jour_homme', 800)
            cout_planification = max(0, (delai_reel - delai_prevue)) * 22 * cout_jour_homme
            
            # Erreurs techniques
            heures_correction = parametres.get('heures_correction', 200)
            taux_horaire_technicien = parametres.get('taux_horaire_technicien', 150)
            cout_technique = heures_correction * taux_horaire_technicien
            
            # Formation inadéquate
            nombre_personnes = parametres.get('nombre_personnes_formation', 50)
            duree_formation = parametres.get('duree_formation_jours', 5)
            cout_formation_par_jour = parametres.get('cout_formation_par_jour', 500)
            cout_formation = nombre_personnes * duree_formation * cout_formation_par_jour
            
            # Configuration personnalisée
            heures_configuration = parametres.get('heures_configuration', 100)
            taux_horaire_developpeur = parametres.get('taux_horaire_developpeur', 200)
            cout_configuration = heures_configuration * taux_horaire_developpeur
            
            couts['erreurs_planification'] = {
                'valeur': cout_planification,
                'description': 'Dépassement délais de mise en œuvre',
                'details': f'{delai_reel - delai_prevue} mois de retard × 22 jours × {cout_jour_homme} MAD/jour'
            }
            couts['erreurs_techniques'] = {
                'valeur': cout_technique,
                'description': 'Corrections techniques et bugs',
                'details': f'{heures_correction} heures × {taux_horaire_technicien} MAD/heure'
            }
            couts['formation_inadequate'] = {
                'valeur': cout_formation,
                'description': 'Formation supplémentaire nécessaire',
                'details': f'{nombre_personnes} personnes × {duree_formation} jours × {cout_formation_par_jour} MAD/jour'
            }
            couts['configuration_personnalisee'] = {
                'valeur': cout_configuration,
                'description': 'Développements spécifiques supplémentaires',
                'details': f'{heures_configuration} heures × {taux_horaire_developpeur} MAD/heure'
            }
            
            couts['total_erreurs'] = cout_planification + cout_technique + cout_formation + cout_configuration
            
        except Exception as e:
            print(f"Erreur dans calcul_couts_erreurs: {e}")
            couts['total_erreurs'] = 0
            
        return couts
    
    def calculer_couts_resistance(self, parametres: Dict) -> Dict:
        couts = {}
        
        try:
            # Baisse de productivité
            taux_baisse_productivite = parametres.get('taux_baisse_productivite', 15)
            salaire_moyen_mensuel = parametres.get('salaire_moyen_mensuel', 8000)
            nombre_employes = parametres.get('nombre_employes', 100)
            duree_mois = parametres.get('duree_adaptation_mois', 3)
            cout_productivite = (taux_baisse_productivite / 100) * salaire_moyen_mensuel * nombre_employes * duree_mois
            
            # Turnover
            nombre_departs = parametres.get('nombre_departs', 5)
            cout_embauche = parametres.get('cout_embauche_par_personne', 10000)
            cout_formation_nouvel_employe = parametres.get('cout_formation_nouvel_employe', 5000)
            cout_turnover = nombre_departs * (cout_embauche + cout_formation_nouvel_employe)
            
            # Résistance passive
            heures_inefficacite = parametres.get('heures_inefficacite', 500)
            taux_horaire_moyen = parametres.get('taux_horaire_moyen', 50)
            cout_resistance = heures_inefficacite * taux_horaire_moyen
            
            # Support supplémentaire
            heures_support = parametres.get('heures_support', 300)
            taux_horaire_support = parametres.get('taux_horaire_support', 100)
            cout_support = heures_support * taux_horaire_support
            
            couts['baisse_productivite'] = {
                'valeur': cout_productivite,
                'description': 'Perte de productivité pendant adaptation',
                'details': f'{taux_baisse_productivite}% × {salaire_moyen_mensuel} MAD × {nombre_employes} employés × {duree_mois} mois'
            }
            couts['turnover'] = {
                'valeur': cout_turnover,
                'description': 'Coûts liés au départ des employés',
                'details': f'{nombre_departs} départs × ({cout_embauche} + {cout_formation_nouvel_employe}) MAD'
            }
            couts['resistance_passive'] = {
                'valeur': cout_resistance,
                'description': 'Heures perdues en résistance passive',
                'details': f'{heures_inefficacite} heures × {taux_horaire_moyen} MAD/heure'
            }
            couts['support_supplementaire'] = {
                'valeur': cout_support,
                'description': 'Support technique supplémentaire',
                'details': f'{heures_support} heures × {taux_horaire_support} MAD/heure'
            }
            
            couts['total_resistance'] = cout_productivite + cout_turnover + cout_resistance + cout_support
            
        except Exception as e:
            print(f"Erreur dans calcul_couts_resistance: {e}")
            couts['total_resistance'] = 0
            
        return couts
    
    def calculer_couts_imprevus(self, parametres: Dict) -> Dict:
        couts = {}
        
        try:
            # Imprévus organisationnels
            heures_retravail = parametres.get('heures_retravail', 300)
            taux_horaire_moyen = parametres.get('taux_horaire_moyen', 50)
            cout_organisationnel = heures_retravail * taux_horaire_moyen
            
            # Problèmes de compatibilité
            heures_integration = parametres.get('heures_integration', 400)
            taux_horaire_technicien = parametres.get('taux_horaire_technicien', 150)
            cout_compatibilite = heures_integration * taux_horaire_technicien
            
            # Coûts de maintenance imprévus
            cout_maintenance_annuel = parametres.get('cout_maintenance_annuel', 100000)
            taux_imprevu = parametres.get('taux_maintenance_imprevu', 20)
            cout_maintenance = cout_maintenance_annuel * (taux_imprevu / 100)
            
            # Évolutions réglementaires
            heures_adaptation = parametres.get('heures_adaptation', 200)
            taux_horaire_expert = parametres.get('taux_horaire_expert', 250)
            cout_reglementaire = heures_adaptation * taux_horaire_expert
            
            couts['imprevus_organisationnels'] = {
                'valeur': cout_organisationnel,
                'description': 'Retravail des processus organisationnels',
                'details': f'{heures_retravail} heures × {taux_horaire_moyen} MAD/heure'
            }
            couts['problemes_compatibilite'] = {
                'valeur': cout_compatibilite,
                'description': 'Intégration avec systèmes existants',
                'details': f'{heures_integration} heures × {taux_horaire_technicien} MAD/heure'
            }
            couts['maintenance_imprevue'] = {
                'valeur': cout_maintenance,
                'description': 'Maintenance supplémentaire non prévue',
                'details': f'{cout_maintenance_annuel} MAD × {taux_imprevu}%'
            }
            couts['evolutions_reglementaires'] = {
                'valeur': cout_reglementaire,
                'description': 'Adaptations réglementaires',
                'details': f'{heures_adaptation} heures × {taux_horaire_expert} MAD/heure'
            }
            
            couts['total_imprevus'] = cout_organisationnel + cout_compatibilite + cout_maintenance + cout_reglementaire
            
        except Exception as e:
            print(f"Erreur dans calcul_couts_imprevus: {e}")
            couts['total_imprevus'] = 0
            
        return couts
    
    def calculer_couts_totaux(self, entreprise: Entreprise, parametres: Dict) -> Dict:
        try:
            couts_erreurs = self.calculer_couts_erreurs(parametres)
            couts_resistance = self.calculer_couts_resistance(parametres)
            couts_imprevus = self.calculer_couts_imprevus(parametres)
            
            total_general = (
                couts_erreurs.get('total_erreurs', 0) + 
                couts_resistance.get('total_resistance', 0) + 
                couts_imprevus.get('total_imprevus', 0)
            )
            
            return {
                'entreprise': {
                    'nom': entreprise.nom,
                    'secteur': entreprise.secteur,
                    'taille': entreprise.taille,
                    'chiffre_affaires': entreprise.chiffre_affaires,
                    'nombre_employes': entreprise.nombre_employes
                },
                'couts_erreurs': couts_erreurs,
                'couts_resistance': couts_resistance,
                'couts_imprevus': couts_imprevus,
                'total_general': total_general,
                'date_calcul': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'pourcentage_ca': (total_general / entreprise.chiffre_affaires * 100) if entreprise.chiffre_affaires > 0 else 0
            }
        except Exception as e:
            print(f"Erreur dans calcul_couts_totaux: {e}")
            return {
                'entreprise': {
                    'nom': entreprise.nom,
                    'secteur': entreprise.secteur,
                    'taille': entreprise.taille,
                    'chiffre_affaires': entreprise.chiffre_affaires,
                    'nombre_employes': entreprise.nombre_employes
                },
                'erreur': str(e),
                'total_general': 0,
                'pourcentage_ca': 0
            }

# Initialisation du calculateur
calculateur = CalculateurCoutsERP()

# Fonctions utilitaires pour l'authentification
def hash_password(password):
    """Hash le mot de passe avec SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def validate_email(email):
    """Valide le format de l'email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Valide la force du mot de passe"""
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    if not any(char.isdigit() for char in password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    if not any(char.isalpha() for char in password):
        return False, "Le mot de passe doit contenir au moins une lettre"
    return True, "Mot de passe valide"

# Routes principales
@app.route('/')
def home():
    """Page d'accueil avec navigation"""
    return render_template('index.html')

@app.route('/signup')
def signup_page():
    """Page d'inscription"""
    return render_template('signup.html')

@app.route('/login')
def login_page():
    """Page de connexion"""
    return render_template('login.html')

@app.route('/products')
def products_page():
    """Page des produits"""
    return render_template('products.html')

@app.route('/about')
def about_page():
    """Page À propos"""
    return render_template('about.html')

@app.route('/contact')
def contact_page():
    """Page de contact"""
    return render_template('contact.html')

# Gestion des erreurs 404
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# API d'authentification
@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    """API pour l'inscription des utilisateurs"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Données JSON manquantes'
            }), 400
        
        # Validation des champs requis
        required_fields = ['nom_complet', 'email', 'password', 'confirm_password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Le champ {field} est requis'
                }), 400
        
        nom_complet = data['nom_complet'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        confirm_password = data['confirm_password']
        
        # Validation de l'email
        if not validate_email(email):
            return jsonify({
                'success': False,
                'error': 'Format d\'email invalide'
            }), 400
        
        # Vérification si l'email existe déjà
        if email in users_db:
            return jsonify({
                'success': False,
                'error': 'Un compte avec cet email existe déjà'
            }), 400
        
        # Validation du mot de passe
        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': message
            }), 400
        
        # Vérification de la confirmation du mot de passe
        if password != confirm_password:
            return jsonify({
                'success': False,
                'error': 'Les mots de passe ne correspondent pas'
            }), 400
        
        # Création de l'utilisateur
        user_id = hashlib.md5(f"{email}{datetime.datetime.now()}".encode()).hexdigest()
        password_hash = hash_password(password)
        
        user = User(user_id, nom_complet, email, password_hash)
        users_db[email] = user
        
        # Connexion automatique après inscription
        session['user_id'] = user_id
        session['user_email'] = email
        session['user_name'] = nom_complet
        session.permanent = True
        
        print(f"✅ Nouvel utilisateur inscrit: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Inscription réussie!',
            'user': {
                'id': user_id,
                'nom_complet': nom_complet,
                'email': email
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur inscription: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erreur lors de l\'inscription: {str(e)}'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API pour la connexion des utilisateurs"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Données JSON manquantes'
            }), 400
        
        # Validation des champs requis
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'error': 'Email et mot de passe requis'
            }), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Vérification de l'existence de l'utilisateur
        if email not in users_db:
            return jsonify({
                'success': False,
                'error': 'Email ou mot de passe incorrect'
            }), 401
        
        user = users_db[email]
        
        # Vérification du mot de passe
        if user.password_hash != hash_password(password):
            return jsonify({
                'success': False,
                'error': 'Email ou mot de passe incorrect'
            }), 401
        
        # Mise à jour de la dernière connexion
        user.derniere_connexion = datetime.datetime.now()
        
        # Connexion réussie
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['user_name'] = user.nom_complet
        session.permanent = True
        
        print(f"✅ Utilisateur connecté: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Connexion réussie!',
            'user': {
                'id': user.id,
                'nom_complet': user.nom_complet,
                'email': user.email
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur connexion: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erreur lors de la connexion: {str(e)}'
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    """API pour la déconnexion"""
    try:
        user_email = session.get('user_email', 'Inconnu')
        session.clear()
        print(f"✅ Utilisateur déconnecté: {user_email}")
        return jsonify({
            'success': True,
            'message': 'Déconnexion réussie'
        })
    except Exception as e:
        print(f"❌ Erreur déconnexion: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erreur lors de la déconnexion'
        }), 500

@app.route('/api/auth/check')
def api_check_auth():
    """API pour vérifier l'état d'authentification"""
    try:
        if 'user_id' in session and 'user_email' in session:
            user_email = session['user_email']
            if user_email in users_db:
                return jsonify({
                    'authenticated': True,
                    'user': {
                        'id': session['user_id'],
                        'email': session['user_email'],
                        'nom_complet': session['user_name']
                    }
                })
        
        return jsonify({
            'authenticated': False
        })
    except Exception as e:
        print(f"❌ Erreur vérification auth: {str(e)}")
        return jsonify({
            'authenticated': False
        })

# API pour les calculs ERP (protégées par authentification)
@app.route('/api/couts/calculer', methods=['POST'])
def calculer_couts():
    """API pour calculer les coûts cachés (nécessite une authentification)"""
    try:
        # Vérification de l'authentification
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Authentification requise. Veuillez vous connecter.'
            }), 401
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Données manquantes'
            }), 400
        
        # Validation des données obligatoires
        required_fields = ['nom_entreprise', 'secteur', 'taille', 'chiffre_affaires', 'nombre_employes']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Le champ {field} est obligatoire'
                }), 400
        
        # Création de l'objet entreprise
        try:
            entreprise = Entreprise(
                nom=data.get('nom_entreprise', 'Entreprise Marocaine'),
                secteur=data.get('secteur', 'Services'),
                taille=data.get('taille', 'Moyenne'),
                chiffre_affaires=float(data.get('chiffre_affaires', 10000000)),
                nombre_employes=int(data.get('nombre_employes', 100))
            )
        except (ValueError, TypeError) as e:
            return jsonify({
                'success': False,
                'error': 'Format des données numérique invalide'
            }), 400
        
        # Récupération des paramètres avec valeurs par défaut
        parametres = data.get('parametres', {})
        
        # Calcul des coûts
        resultats = calculateur.calculer_couts_totaux(entreprise, parametres)
        
        # Sauvegarde en session pour historique
        if 'historique' not in session:
            session['historique'] = []
        
        # Limiter l'historique à 50 entrées maximum
        if len(session['historique']) >= 50:
            session['historique'] = session['historique'][-49:]
        
        session['historique'].append({
            'timestamp': datetime.datetime.now().isoformat(),
            'entreprise': resultats['entreprise'],
            'total_general': resultats['total_general'],
            'user_id': session['user_id']
        })
        
        print(f"✅ Calcul effectué pour: {entreprise.nom} par {session['user_email']}")
        
        return jsonify({
            'success': True,
            'resultats': resultats
        })
    
    except Exception as e:
        print(f"❌ Erreur calcul coûts: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erreur lors du calcul: {str(e)}'
        }), 500

@app.route('/api/couts/definitions')
def get_definitions_couts():
    """API pour récupérer les définitions des coûts"""
    try:
        return jsonify({
            'success': True,
            'couts_erreurs': [{
                'nom': cout.nom,
                'description': cout.description,
                'formule': cout.formule_calcul,
                'unite': cout.unite
            } for cout in calculateur.couts_erreurs],
            'couts_resistance': [{
                'nom': cout.nom,
                'description': cout.description,
                'formule': cout.formule_calcul,
                'unite': cout.unite
            } for cout in calculateur.couts_resistance],
            'couts_imprevus': [{
                'nom': cout.nom,
                'description': cout.description,
                'formule': cout.formule_calcul,
                'unite': cout.unite
            } for cout in calculateur.couts_imprevus]
        })
    except Exception as e:
        print(f"❌ Erreur définitions: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erreur lors du chargement des définitions'
        }), 500

@app.route('/api/entreprise/exemples')
def get_exemples_entreprises():
    """API pour récupérer les exemples d'entreprises"""
    try:
        exemples = [
            {
                'nom': 'Société Industrielle Marocaine (SIM)',
                'secteur': 'Industrie',
                'taille': 'Grande',
                'chiffre_affaires': 50000000,
                'nombre_employes': 300,
                'description': 'Entreprise industrielle avec processus complexes'
            },
            {
                'nom': 'Distributeur National (DN)',
                'secteur': 'Distribution',
                'taille': 'Moyenne',
                'chiffre_affaires': 20000000,
                'nombre_employes': 150,
                'description': 'Chaîne de distribution nationale'
            },
            {
                'nom': 'PME Services (PME-S)',
                'secteur': 'Services',
                'taille': 'Petite',
                'chiffre_affaires': 5000000,
                'nombre_employes': 50,
                'description': 'PME spécialisée dans les services'
            },
            {
                'nom': 'Groupe Textile Marocain (GTM)',
                'secteur': 'Textile',
                'taille': 'Grande',
                'chiffre_affaires': 80000000,
                'nombre_employes': 500,
                'description': 'Groupe textile exportateur'
            }
        ]
        return jsonify({
            'success': True,
            'exemples': exemples
        })
    except Exception as e:
        print(f"❌ Erreur exemples: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erreur lors du chargement des exemples'
        }), 500

@app.route('/api/historique')
def get_historique():
    """API pour récupérer l'historique des calculs (protégé)"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': True,
                'historique': []
            })
        
        user_historique = [item for item in session.get('historique', []) 
                          if item.get('user_id') == session['user_id']]
        
        # Trier par date décroissante
        user_historique.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'historique': user_historique
        })
    except Exception as e:
        print(f"❌ Erreur historique: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erreur lors du chargement de l\'historique'
        }), 500

@app.route('/api/rapport/pdf', methods=['POST'])
def generer_rapport_pdf():
    """API pour générer un rapport PDF (protégé)"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Authentification requise'
            }), 401
        
        data = request.get_json()
        if not data or not data.get('resultats'):
            return jsonify({
                'success': False,
                'error': 'Données de résultat manquantes'
            }), 400
        
        resultats = data.get('resultats')
        
        # Simulation de génération de rapport
        rapport = {
            'titre': f"Rapport des Coûts Cachés ERP - {resultats['entreprise']['nom']}",
            'date_generation': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'utilisateur': session['user_name'],
            'resume': {
                'total_erreurs': resultats.get('couts_erreurs', {}).get('total_erreurs', 0),
                'total_resistance': resultats.get('couts_resistance', {}).get('total_resistance', 0),
                'total_imprevus': resultats.get('couts_imprevus', {}).get('total_imprevus', 0),
                'total_general': resultats.get('total_general', 0),
                'pourcentage_ca': resultats.get('pourcentage_ca', 0)
            },
            'details_erreurs': resultats.get('couts_erreurs', {}),
            'details_resistance': resultats.get('couts_resistance', {}),
            'details_imprevus': resultats.get('couts_imprevus', {})
        }
        
        print(f"✅ Rapport généré pour: {session['user_email']}")
        
        return jsonify({
            'success': True,
            'rapport': rapport,
            'message': 'Rapport généré avec succès',
            'download_url': '/api/rapport/download/simulation.pdf'  # Simulation
        })
    
    except Exception as e:
        print(f"❌ Erreur génération rapport: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erreur lors de la génération du rapport: {str(e)}'
        }), 500

@app.route('/api/statistiques/secteur', methods=['POST'])
def statistiques_par_secteur():
    """API pour les statistiques par secteur"""
    try:
        data = request.get_json()
        secteur = data.get('secteur', 'Tous')
        
        # Données statistiques simulées pour le Maroc
        stats_secteurs = {
            'Industrie': {
                'couts_moyens_erreurs': 450000,
                'couts_moyens_resistance': 350000,
                'couts_moyens_imprevus': 300000,
                'total_moyen': 1100000,
                'nombre_implementations': 25,
                'taux_reussite': '72%'
            },
            'Services': {
                'couts_moyens_erreurs': 300000,
                'couts_moyens_resistance': 250000,
                'couts_moyens_imprevus': 200000,
                'total_moyen': 750000,
                'nombre_implementations': 40,
                'taux_reussite': '85%'
            },
            'Distribution': {
                'couts_moyens_erreurs': 400000,
                'couts_moyens_resistance': 300000,
                'couts_moyens_imprevus': 250000,
                'total_moyen': 950000,
                'nombre_implementations': 30,
                'taux_reussite': '78%'
            },
            'Textile': {
                'couts_moyens_erreurs': 500000,
                'couts_moyens_resistance': 400000,
                'couts_moyens_imprevus': 350000,
                'total_moyen': 1250000,
                'nombre_implementations': 15,
                'taux_reussite': '65%'
            },
            'Tous': {
                'couts_moyens_erreurs': 412500,
                'couts_moyens_resistance': 325000,
                'couts_moyens_imprevus': 275000,
                'total_moyen': 1012500,
                'nombre_implementations': 110,
                'taux_reussite': '75%'
            }
        }
        
        return jsonify({
            'success': True,
            'secteur': secteur,
            'statistiques': stats_secteurs.get(secteur, stats_secteurs['Tous'])
        })
    
    except Exception as e:
        print(f"❌ Erreur statistiques: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erreur lors du chargement des statistiques'
        }), 500

@app.route('/api/recommandations', methods=['POST'])
def get_recommandations():
    """API pour les recommandations personnalisées"""
    try:
        data = request.get_json()
        if not data or not data.get('resultats'):
            return jsonify({
                'success': False,
                'error': 'Données de résultat manquantes'
            }), 400
        
        resultats = data.get('resultats')
        
        recommandations = []
        
        total_erreurs = resultats.get('couts_erreurs', {}).get('total_erreurs', 0)
        total_resistance = resultats.get('couts_resistance', {}).get('total_resistance', 0)
        total_imprevus = resultats.get('couts_imprevus', {}).get('total_imprevus', 0)
        
        # Recommandations basées sur les coûts les plus élevés
        couts_par_categorie = [
            ('Erreurs', total_erreurs),
            ('Résistance au changement', total_resistance),
            ('Imprévus', total_imprevus)
        ]
        
        couts_par_categorie.sort(key=lambda x: x[1], reverse=True)
        
        categorie_principale = couts_par_categorie[0][0] if couts_par_categorie else 'Général'
        
        if categorie_principale == 'Erreurs':
            recommandations.extend([
                "🔧 Renforcer la planification initiale avec une marge de 20%",
                "📊 Réaliser une étude de faisabilité approfondie",
                "⏱️ Établir un calendrier réaliste avec jalons intermédiaires",
                "👥 Impliquer un consultant ERP expérimenté"
            ])
        
        if categorie_principale == 'Résistance au changement':
            recommandations.extend([
                "💬 Mettre en place un programme de communication proactive",
                "🎓 Développer un plan de formation adapté aux différents profils",
                "🤝 Impliquer les utilisateurs clés dès le début du projet",
                "🏆 Créer un système de récompense pour l'adoption du nouveau système"
            ])
        
        if categorie_principale == 'Imprévus':
            recommandations.extend([
                "🛡️ Prévoir une réserve de 15-25% pour les imprévus",
                "🔍 Identifier et prioriser les risques en amont",
                "📋 Mettre en place un comité de suivi des risques",
                "🔄 Adopter une approche agile avec itérations courtes"
            ])
        
        # Recommandations générales
        recommandations.extend([
            "✅ Former une équipe projet dédiée et compétente",
            "🎯 Choisir un ERP adapté à la taille et au secteur",
            "📝 Négocier un contrat de support et maintenance clair",
            "📈 Mesurer régulièrement l'avancement et les écarts",
            "🔄 Prévoir des revues de projet trimestrielles"
        ])
        
        return jsonify({
            'success': True,
            'recommandations': recommandations,
            'categorie_principale': categorie_principale
        })
    
    except Exception as e:
        print(f"❌ Erreur recommandations: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erreur lors de la génération des recommandations'
        }), 500

# Route de santé de l'application
@app.route('/api/health')
def health_check():
    """Endpoint de santé de l'application"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.now().isoformat(),
        'version': '1.0.0',
        'users_count': len(users_db)
    })

# Middleware pour vérifier l'authentification sur les routes protégées
@app.before_request
def check_authentication():
    """Vérifie l'authentification pour les routes protégées"""
    protected_routes = ['/api/couts/calculer', '/api/historique', '/api/rapport/pdf']
    
    if request.path in protected_routes and request.method == 'POST':
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Authentification requise. Veuillez vous connecter.'
            }), 401

# Initialisation des données de démonstration
def init_demo_data():
    """Initialise des données de démonstration"""
    demo_user = User(
        'demo_user_123',
        'Utilisateur Démo',
        'demo@erp.ma',
        hash_password('demo123')
    )
    users_db['demo@erp.ma'] = demo_user
    print("✅ Données de démonstration initialisées")

# Initialisation au démarrage
init_demo_data()

if __name__ == '__main__':
    print("🚀 Démarrage de l'application ERP Cost Calculator...")
    print("📊 Calculateur des coûts cachés ERP - Version 1.0.0")
    print("🌐 Application accessible sur: http://localhost:5000")
    print("🔐 Compte démo disponible: demo@erp.ma / demo123")
    app.run(debug=True, host='0.0.0.0', port=5000)
import {
  Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { WebsocketService } from '../../../core/services/websocket';
import { ThemeService } from '../../../core/services/theme';
import * as L from 'leaflet';

interface BusSuivi {
  busId: string;
  immatriculation: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  enRetard: boolean;
  remplissage: number;
  attente: number;
  ligneId?: string;
  majLe: number;
}

@Component({
  selector: 'app-carte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carte.html',
  styleUrl: './carte.css'
})
export class CarteComponent implements OnInit, OnDestroy, AfterViewInit {

  private map!: L.Map;
  private tuiles?: L.TileLayer;
  private markers = new Map<string, L.Marker>();
  private lignePolylines = new Map<string, L.Polyline>();
  private subscription!: Subscription;

  busConnectes: BusSuivi[] = [];
  lignes: any[] = [];
  ligneSelectionnee = 'toutes';
  connecte = false;

  totalVehicules = 0;
  totalEnLigne = 0;
  totalEnRetard = 0;
  attenteMoyenne = 0;

  // Coordonnées des principaux points de Dakar. À terme ces positions
  // doivent venir de l'entité Arret côté backend (elle possède déjà un
  // champ position) — ce dictionnaire n'est qu'un repli de démonstration.
  private readonly coordonnees: Record<string, [number, number]> = {
    'Gare Routière Dakar': [14.6921, -17.4467],
    'Plateau':             [14.6937, -17.4441],
    'Médina':              [14.6839, -17.4531],
    'Liberté 6':           [14.7167, -17.4667],
    'Pikine':              [14.7500, -17.3833],
    'Guédiawaye':          [14.7700, -17.4000],
    'Diamniadio':          [14.7167, -17.1833],
    'UCAD':                [14.6690, -17.4620],
    'Almadies':            [14.7420, -17.5170],
    'Rufisque':            [14.7167, -17.2667],
    'Yoff':                [14.7550, -17.4700],
    'Parcelles Assainies': [14.7650, -17.4300]
  };

  private readonly couleursLignes = ['#f5a623', '#2ecc71', '#4aa8ff', '#ef2b2d', '#b06bff', '#00d4c8'];

  constructor(
    private wsService: WebsocketService,
    private http: HttpClient,
    private authService: AuthService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    // Au changement de thème, les contours des marqueurs (dessinés en JS)
    // doivent être repeints : le CSS seul ne peut pas les atteindre.
    effect(() => {
      this.themeService.theme();
      this.rafraichirCouleursCarte();
    });
  }

  private rafraichirCouleursCarte(): void {
    if (!this.map) return;
    this.appliquerTuiles();

    const fond = this.couleurFondCarte();
    this.map.eachLayer(couche => {
      if (couche instanceof L.CircleMarker) {
        couche.setStyle({ color: fond });
      }
    });
  }

  /**
   * CartoDB publie deux jeux de tuiles, sombre et clair. On échange la couche
   * plutôt que d'inverser les couleurs en CSS : le rendu reste net et lisible,
   * là où une inversion donne une carte grise et délavée.
   */
  private appliquerTuiles(): void {
    if (this.tuiles) {
      this.map.removeLayer(this.tuiles);
    }

    const jeu = this.themeService.theme() === 'clair' ? 'light_all' : 'dark_all';

    this.tuiles = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${jeu}/{z}/{x}/{y}{r}.png`,
      { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
    ).addTo(this.map);

    // Les tuiles doivent rester sous les tracés de lignes et les marqueurs.
    this.tuiles.bringToBack();
  }

  ngOnInit(): void {
    this.chargerLignes();
    this.wsService.connect();
    this.subscription = this.wsService.positionsGPS$
      .subscribe(position => {
        this.connecte = true;
        this.mettreAJourListeBus(position);
        this.mettreAJourMarqueur(position);
        this.calculerStats();
        this.cdr.detectChanges();
      });
  }

  ngAfterViewInit(): void {
    this.initialiserCarte();
  }

  // Liste filtrée selon la ligne sélectionnée dans le panneau latéral
  get busAffiches(): BusSuivi[] {
    if (this.ligneSelectionnee === 'toutes') return this.busConnectes;
    return this.busConnectes.filter(b => b.ligneId === this.ligneSelectionnee);
  }

  initialiserCarte(): void {
    this.map = L.map('carte-dakar', { zoomControl: false })
      .setView([14.6937, -17.4441], 12);

    this.appliquerTuiles();

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Les lignes peuvent avoir été chargées avant que la carte n'existe
    if (this.lignes.length > 0) {
      this.dessinerLignes(this.lignes);
    }
  }

  chargerLignes(): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    this.http.get<any[]>('/api/v1/transport/lignes', { headers })
      .subscribe({
        next: (data) => {
          this.lignes = data;
          if (this.map) this.dessinerLignes(data);
        }
      });
  }

  couleurLigne(index: number): string {
    return this.couleursLignes[index % this.couleursLignes.length];
  }

  // Lit la couleur de fond réellement appliquée par le thème courant, plutôt
  // que de la coder en dur : les marqueurs restent lisibles dans les deux modes.
  private couleurFondCarte(): string {
    return this.jeton('--nuit-800', '#0a1628');
  }

  // Résout une variable CSS du thème actif, avec repli si elle est absente.
  private jeton(nom: string, defaut: string): string {
    const valeur = getComputedStyle(document.documentElement)
      .getPropertyValue(nom).trim();
    return valeur || defaut;
  }

  couleurStatut(enRetard: boolean): string {
    return enRetard
      ? this.jeton('--danger', '#ff5252')
      : this.jeton('--succes', '#2ecc71');
  }

  dessinerLignes(lignes: any[]): void {
    lignes.forEach((ligne, i) => {
      const depart = this.coordonnees[ligne.depart];
      const arrivee = this.coordonnees[ligne.arrivee];
      if (!depart || !arrivee) return;

      const couleur = this.couleurLigne(i);

      const polyline = L.polyline([depart, arrivee], {
        color: couleur,
        weight: 3.5,
        opacity: 0.75
      }).addTo(this.map)
        .bindPopup(this.popupLigne(ligne, couleur));

      this.lignePolylines.set(ligne.id, polyline);

      [depart, arrivee].forEach((coord, idx) => {
        L.circleMarker(coord, {
          radius: 6,
          fillColor: couleur,
          // Le contour suit le fond de la carte pour détacher la pastille
          // aussi bien en thème sombre qu'en thème clair.
          color: this.couleurFondCarte(),
          weight: 2.5,
          fillOpacity: 1
        }).addTo(this.map)
          .bindPopup(`<b style="color:${couleur}">${idx === 0 ? ligne.depart : ligne.arrivee}</b>`);
      });
    });
  }

  private popupLigne(ligne: any, couleur: string): string {
    return `
      <div style="min-width:170px">
        <div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;color:${couleur}">
          ${ligne.numero}
        </div>
        <div style="font-size:12px;margin-top:5px;opacity:.8">
          ${ligne.depart} → ${ligne.arrivee}
        </div>
        <div style="font-size:12px;margin-top:5px;color:#f5a623;font-weight:600">
          ${ligne.tarif} FCFA · ${ligne.dureeMinutes ?? '—'} min
        </div>
      </div>`;
  }

  // Le backend ne fournit pour l'instant que la position brute. Les autres
  // indicateurs sont simulés une seule fois par bus, à sa première apparition,
  // puis conservés — sinon ils changeraient à chaque message WebSocket et le
  // bus clignoterait entre « en retard » et « en ligne » toutes les 5 secondes.
  mettreAJourListeBus(position: any): void {
    const existant = this.busConnectes.find(b => b.busId === position.busId);

    if (existant) {
      existant.latitude = position.latitude;
      existant.longitude = position.longitude;
      existant.majLe = Date.now();
      if (position.vitesse != null) existant.vitesse = Math.round(position.vitesse);
      return;
    }

    this.busConnectes.push({
      busId: position.busId,
      immatriculation: position.immatriculation || 'Bus',
      latitude: position.latitude,
      longitude: position.longitude,
      vitesse: position.vitesse != null ? Math.round(position.vitesse) : this.aleatoire(12, 48),
      enRetard: Math.random() > 0.75,
      remplissage: this.aleatoire(35, 95),
      attente: this.aleatoire(2, 14),
      ligneId: position.ligneId,
      majLe: Date.now()
    });
  }

  private aleatoire(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  mettreAJourMarqueur(position: any): void {
    const bus = this.busConnectes.find(b => b.busId === position.busId);
    if (!bus) return;

    const couleur = bus.enRetard ? 'var(--danger)' : 'var(--succes)';
    const couleurBrute = this.couleurStatut(bus.enRetard);

    const icone = L.divIcon({
      html: `
        <div class="marqueur-bus-contenu">
          <div class="marqueur-halo" style="background:${couleurBrute}"></div>
          <div class="marqueur-pastille" style="border-color:${couleurBrute}">🚌</div>
          <div class="marqueur-etiquette" style="background:${couleurBrute}">
            ${bus.immatriculation}
          </div>
        </div>`,
      className: 'marqueur-bus',
      iconSize: [64, 56],
      iconAnchor: [32, 46]
    });

    const marqueurExistant = this.markers.get(bus.busId);

    if (marqueurExistant) {
      marqueurExistant.setLatLng([bus.latitude, bus.longitude]);
      marqueurExistant.setPopupContent(this.popupBus(bus, couleurBrute));
    } else {
      const marker = L.marker([bus.latitude, bus.longitude], { icon: icone })
        .addTo(this.map)
        .bindPopup(this.popupBus(bus, couleurBrute));
      this.markers.set(bus.busId, marker);
    }
    // couleur n'est utilisée que pour documenter l'intention côté template
    void couleur;
  }

  private popupBus(bus: BusSuivi, couleur: string): string {
    return `
      <div style="min-width:190px">
        <div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;color:#f5a623">
          🚌 ${bus.immatriculation}
        </div>
        <div style="display:flex;gap:14px;margin-top:9px;font-size:12px">
          <div><div style="opacity:.55;font-size:10px">VITESSE</div>
               <b>${bus.vitesse} km/h</b></div>
          <div><div style="opacity:.55;font-size:10px">REMPLISSAGE</div>
               <b>${bus.remplissage}%</b></div>
        </div>
        <div style="margin-top:9px;font-size:11.5px;color:${couleur};font-weight:600">
          ${bus.enRetard ? '● En retard' : '● En ligne'} · arrêt dans ${bus.attente} min
        </div>
        <div style="margin-top:6px;font-size:10.5px;opacity:.45">
          ${bus.latitude.toFixed(4)}, ${bus.longitude.toFixed(4)}
        </div>
      </div>`;
  }

  calculerStats(): void {
    const liste = this.busConnectes;
    this.totalVehicules = liste.length;
    this.totalEnLigne = liste.filter(b => !b.enRetard).length;
    this.totalEnRetard = liste.filter(b => b.enRetard).length;
    this.attenteMoyenne = liste.length
      ? Math.round(liste.reduce((s, b) => s + b.attente, 0) / liste.length)
      : 0;
  }

  couleurRemplissage(taux: number): string {
    if (taux > 80) return this.jeton('--danger', '#ff5252');
    if (taux > 60) return this.jeton('--alerte', '#ff9800');
    return this.jeton('--succes', '#2ecc71');
  }

  centrerSurBus(busId: string): void {
    const marker = this.markers.get(busId);
    if (marker) {
      this.map.setView(marker.getLatLng(), 15, { animate: true });
      marker.openPopup();
    }
  }

  filtrerLigne(ligneId: string): void {
    this.ligneSelectionnee = ligneId;

    // Met en évidence la ligne choisie et estompe les autres
    this.lignePolylines.forEach((polyline, id) => {
      const visible = ligneId === 'toutes' || id === ligneId;
      polyline.setStyle({ opacity: visible ? 0.85 : 0.12, weight: visible ? 4 : 2 });
    });
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
    if (this.subscription) this.subscription.unsubscribe();
    if (this.map) this.map.remove();
  }
}

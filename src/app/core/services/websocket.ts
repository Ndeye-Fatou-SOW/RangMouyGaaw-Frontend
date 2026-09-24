import { Injectable, NgZone } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {

  private client: Client;
  public positionsGPS$ = new Subject<any>();

  // Construit l'URL du broker à partir de l'hôte courant : le proxy Angular
  // relaie /ws vers le backend (ws: true), et en production l'application
  // suit automatiquement le domaine et le protocole de déploiement.
  private static urlBroker(): string {
    const protocole = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocole}//${window.location.host}/ws/transport`;
  }

  constructor(private zone: NgZone) {
    this.client = new Client({
      brokerURL: WebsocketService.urlBroker(),
      onConnect: () => {
        console.log('WebSocket connecté ✅');
        this.client.subscribe('/topic/bus-positions',
          (msg: IMessage) => {
            const position = JSON.parse(msg.body);
            console.log('Position GPS reçue:', position);
            // Rentre explicitement dans la zone Angular pour que
            // la détection de changement se déclenche correctement.
            this.zone.run(() => {
              this.positionsGPS$.next(position);
            });
          }
        );
      },
      onDisconnect: () => console.log('WebSocket déconnecté'),
      onStompError: (frame) => console.error('Erreur STOMP:', frame),
      reconnectDelay: 5000
    });
  }

  public connect(): void {
    if (!this.client.active) {
      this.client.activate();
    }
  }

  public disconnect(): void {
    if (this.client.active) {
      this.client.deactivate();
    }
  }
}
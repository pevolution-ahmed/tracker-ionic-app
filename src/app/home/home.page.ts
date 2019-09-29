import { Component, ElementRef, ViewChild } from '@angular/core';
import {Plugins } from '@capacitor/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
const { Geolocation } = Plugins;
import { map } from 'rxjs/operators';

declare var google;
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
 
  locations:Observable<any>;
  locationsCollection: AngularFirestoreCollection


  @ViewChild('map' , { static:false}) mapElement : ElementRef;
  map: any;
  markers = [];


  isTracking = false;
  watch: string;
  user = null;

  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {

    this.anonLogin();
  }
  ionViewWillEnter(){
    this.loadMap();
  }
  loadMap(){
    let latLng = new google.maps.LatLng(51.9036442, 7.6673267);

    let mapOptions = {
      center : latLng,
      zoom : 5,
      mapTypeId : google.maps.MapTypeId.ROADMAP
    }
    this.map = new google.maps.Map(this.mapElement.nativeElement,mapOptions);
  }
  anonLogin(){
    this.afAuth.auth.signInAnonymously()
    .then(res =>{
        this.user = res.user;
        this.locationsCollection = this.afs.collection(`locations/${this.user.uid}/track`,
        ref => ref.orderBy('timestamp'));
        this.locationsCollection = this.afs.collection(
          `locations/${this.user.uid}/track`,
          ref => ref.orderBy('timestamp')
        );
        // Make sure we also get the Firebase item ID!
        this.locations = this.locationsCollection.snapshotChanges().pipe(
          map(actions =>
            actions.map(a => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        );
        // Update Map marker on every change
        this.locations.subscribe(locations => {
            this.updateMap(locations);
          });
    });
   
    }
      // Use Capacitor to track our geolocation
  startTracking() {
    this.isTracking = true;
    this.watch = Geolocation.watchPosition({}, (position, err) => {
      if (position) {
        this.addNewLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.timestamp
        );
      }
    });
  }
  stopTracking() {
    Geolocation.clearWatch({ id: this.watch }).then(() => {
      this.isTracking = false;
    });
  }

  addNewLocation(lat, lng, timestamp) {
    this.locationsCollection.add({
      lat,
      lng,
      timestamp
    });
    let position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(5);
  }
  deleteLocation(pos) {
    this.locationsCollection.doc(pos.id).delete();
  }

  updateMap(locations) {
    // Remove all current marker
    this.markers.map(marker => marker.setMap(null));
    this.markers = [];
  
    for (let loc of locations) {
      let latLng = new google.maps.LatLng(loc.lat, loc.lng);
  
      let marker = new google.maps.Marker({
        map: this.map,
        animation: google.maps.Animation.DROP,
        position: latLng
      });
      this.markers.push(marker);
    }
  }
}



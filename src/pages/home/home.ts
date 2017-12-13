import { Component } from '@angular/core';
import { IonicPage, NavController, LoadingController, ModalController } from 'ionic-angular';
import { AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from 'angularfire2/database';
import { Geolocation } from '@ionic-native/geolocation';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private watch: any;
  public lat = 0;
  public long = 0;
  public cont = 0; //CONTADOR DE COORDENADAS ENVIADAS A LA NUBE

  public selected_category_id;
  public selected_unit_id;
  public isTracking = 0; //ESTADO DE SEGUIMIENTO
  public units_by_category_id;
  public driver_by_unit_id: any = {};

  public all_categories: Array<any> = [];
  public all_units: Array<any> = [];
  public all_drivers: Array<any> = [];

  unit_tracker: FirebaseObjectObservable<any[]>;
  active_units: FirebaseObjectObservable<any[]>; //LISTA DE TRANSPORTES ACTIVOS QUE SERÁ LEIDA POR LA APP
  category_transport: FirebaseListObservable<any[]>;
  unit_transport: FirebaseListObservable<any[]>;
  driver_transport: FirebaseListObservable<any[]>;
  business: FirebaseListObservable<any[]>;
  tracker: FirebaseListObservable<any>;

  constructor(
    private afDB: AngularFireDatabase,
    private geolocation: Geolocation,
    public loadingCtrl: LoadingController,
    public modalCtrl: ModalController) {

    let loader = this.loadingCtrl.create({
      content: "Obteniendo Datos...",
    });
    loader.present().then(() => {

      this.tracker = this.afDB.list("/geolocation_history");
      //this.driver_by_unit_id.name = "--";

      this.category_transport = this.afDB.list('/transport_categories');
      this.unit_transport = afDB.list('/transport_units');
      this.driver_transport = afDB.list('/transport_drivers');

      let count1 = 0;
      this.category_transport.subscribe((data) => {
        this.all_categories = data;
        console.log("instituciones: ", this.all_categories);

        //SI ES PRIMERA VEZ QUE OBTIENE DATOS DE INSTITUCIONES PONE INSTITUCIÓN POR DEFECTO
        if (count1 == 0) {
          this.selected_category_id = this.all_categories[0].id;
          console.log("institucion seleccionada (por defecto): ", this.selected_category_id);
        }
        count1++;
      });

      let count2 = 0;
      this.unit_transport.subscribe((data) => {
        this.all_units = data;
        console.log("divisiones: ", this.all_units);

        //SI ES PRIMERA VEZ QUE OBTIENE DATOS DIVISIONES PONE DIVISION POR DEFECTO
        if (count2 == 0 && count1 == 1) {
          this.onSelectCategory();
        }
        count2++;
      });

      this.driver_transport.subscribe((data) => {
        loader.dismiss();
        this.all_drivers = data;
      });

    })

  }

  onSelectCategory() {

    this.units_by_category_id = this.all_units.filter((item) => item.id_transport_category == this.selected_category_id);
    console.log("categoria seleccionada: ", this.selected_category_id);
    console.log("unidades de la categoria: ", this.units_by_category_id);
    this.selected_unit_id = this.units_by_category_id[0].id;
    console.log("unidad seleccionada: ", this.selected_unit_id);

  }


  onSelectUnit(key_unit) {
    console.log(key_unit);
    this.selected_unit_id = key_unit;
  }

  startGeolocation(_unit_id) {
    this.cont = 0;
    this.unit_tracker = this.afDB.object('/transport_units/' + this.selected_unit_id);
    //CREA REGISTROS CON KEYS IDENTICAS A LA KEY DE LA UNIDAD DE TRANSPORTE
    this.active_units = this.afDB.object('/transport_active_units/' + this.selected_unit_id);

    this.isTracking = 1;
    let fake = 0.0001000;
    let options = { timeout: 3000, enableHighAccuracy: true, frequency: 3000, };
    this.watch = this.geolocation.watchPosition(options)
      .subscribe((data) => {
        fake = fake + 0.0001000;
        this.lat = data.coords.latitude + fake;
        this.long = data.coords.longitude;
        this.cont = this.cont + 1;
        let date = this.timeConverter(data.timestamp);
        this.tracker.push({ lat: this.lat, long: this.long, transport_unit_id: _unit_id, timestamp: data.timestamp, created_at: date });
        this.unit_tracker.update({ last_latitude: this.lat, last_longitude: this.long, created_at: date, state: this.isTracking });
        this.active_units.set({ last_latitude: this.lat, last_longitude: this.long, created_at: date });

        console.log(data);
      });
  }

  stopGeolocation() {
    this.isTracking = 0;
    this.lat = 0;
    this.long = 0;
    this.unit_tracker.update({ state: this.isTracking });
    this.watch.unsubscribe(); //DEJO DE HACER GEOLOCALIZACION
    this.active_units.remove(); //ELIMINO DISPOSITIVO DE LISTA DISPOSITIVOS ACTIVOS DE LA NUBE
  }

  timeConverter(timestamp) {
    let a = new Date(timestamp);
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let year = a.getFullYear();
    let month = months[a.getMonth()];
    let date = a.getDate();
    let hour = a.getHours();
    let min = a.getMinutes();
    let sec = a.getSeconds();
    let time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
  }

  openModal() {
    let myModal = this.modalCtrl.create('ConfiguracionPage', { selected_category_id: this.selected_category_id, selected_unit_id: this.selected_unit_id } , { cssClass: 'inset-modal' });
      
    myModal.onDidDismiss(response => {
      
      console.log("respuesta del modal: ", response)
      this.selected_category_id = response.selected_category_id;
      this.selected_unit_id = response.selected_unit_id;
      /*
      if(cod_asignatura){
        this.cod_asignatura = cod_asignatura;
        this.cod_periodo = this.asignaturas[cod_asignatura].cod_periodo;
      }*/
        
    });
    
    myModal.present();

  }



}
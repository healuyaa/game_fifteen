import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  access_id: string;
  constructor(public http: HttpClient) { 
  }
  registration(login: string, pass: string) {
    return this.http.post('/api/registration', {login: login, pass: pass});
  }
  login(login: string, pass: string) {
    return this.http.post('/api/login', {login: login, pass: pass});
  }
  logout() {
    return this.http.post('/api/logout', {access_id: this.access_id});
  }
  saveResult(result: number) {
    return this.http.post('/api/result/save', {access_id: this.access_id, result: result});
  }
  getResult() {
    return this.http.post('/api/result/get', {access_id: this.access_id});
  }
  getResults() {
    return this.http.post('/api/result/list', {access_id: this.access_id});
  }
}

import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  headers = JSON.stringify({
    test: 'test'
  });

  getHeaders(): void {
    // const res = this.http.get(document.location.origin);
    // res.subscribe(data => {
    //   console.log(data);
    // })

    var req = new XMLHttpRequest();
    req.open('GET', document.location.origin, false);
    req.send(null);
    var headers = req.getAllResponseHeaders().toLowerCase();
    alert(headers);
  }

  constructor(
    private readonly http: HttpClient
  ) {
    this.getHeaders();
  }
}

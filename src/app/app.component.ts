import { Component } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { ServerService } from './server.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogInfoComponent } from './dialog-info/dialog-info.component';
import { DialogRegLogComponent } from './dialog-reg-log/dialog-reg-log.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'game_fifteen';
  userlogin: string;
  best_result: number = 9999999;

  ngOnInit() {
    this.openDialogRegLog();
  }

  constructor(public server: ServerService, public dialog: MatDialog) {};
  registration(login: string, pass: string) {
    this.server.registration(login, pass).subscribe((result) => {
    });
  }
  login(login: string, pass: string) {
    this.server.login(login, pass).subscribe((result: any) => {
      this.server.access_id = result.access_id;
    });
  }
  logout() {
    this.server.logout().subscribe((result) => {
      this.server.access_id = "";
      this.userlogin = null;
      this.openDialogRegLog();
    })
  }
  getResults() {
    this.server.getResults().subscribe((result: any) => {
      this.openDialogInfo(result);
    });
  }
  openDialogInfo(results: any) {
    this.dialog.open(DialogInfoComponent, {
      restoreFocus: false,
      width: '500px',
      height: '400px',
      data: {results: results},
      autoFocus: true,
      disableClose: true
    });
  }
  openDialogRegLog() {
    const dial = this.dialog.open(DialogRegLogComponent, {
      restoreFocus: false,
      width: '600px',
      height: '300px',
      data: {},
      autoFocus: true,
      disableClose: true
    });
    dial.afterClosed().subscribe((result) => {
      if(result) {
        this.userlogin = result;
        this.server.getResult().subscribe((res: any) => {
          this.best_result = Math.round(res.result);
        })
      }
    })
  }
}

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { Component, OnInit, Inject, ViewChild, ElementRef, AfterContentInit } from '@angular/core';
import { ServerService } from '../server.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackComponent } from '../snack/snack.component';

@Component({
  selector: 'app-dialog-reg-log',
  templateUrl: './dialog-reg-log.component.html',
  styleUrls: ['./dialog-reg-log.component.css']
})
export class DialogRegLogComponent {

  userlogin: string = "";
  password: string = "";

  constructor(public snackBar: MatSnackBar, public server: ServerService, public dialogRef: MatDialogRef<DialogRegLogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  login() {
    this.server.login(this.userlogin, this.password).subscribe((result: any) => {
      if(result.result) {
        this.server.access_id = result.access_id;
        this.dialogRef.close(this.userlogin);
      } else {
        this.snackBar.openFromComponent(SnackComponent, {
          duration: 3000,
          horizontalPosition: 'right', 
          verticalPosition: 'top',
          data: {msg: "Неправильный пароль или имя пользователя"}
        })
      }
    });
  }

  register() {
    this.server.registration(this.userlogin, this.password).subscribe((result: any) => {
      if(result.result) {
        this.login();
      } else {
        this.snackBar.openFromComponent(SnackComponent, {
          duration: 3000,
          horizontalPosition: 'right', 
          verticalPosition: 'top',
          data: {msg: "Пользователь с таким именем уже существует"}
        })
      }
    })
  }
}

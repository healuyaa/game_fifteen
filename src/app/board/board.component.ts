import {Component, Directive, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { single } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { ServerService } from '../server.service';

class Element {
  public idx: number = 0;
  num: number = 0; 
  empty: boolean = true;
};

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent {

  @ViewChild('progressComp') progressComp: MatProgressBar;

  @Output() result: EventEmitter<number> = new EventEmitter<number>();

  rowLen: number = 4;
  progress: number = 0;

  play_timer: any = null;
  counter: number = 0;

  public elements: Element[] = [
    //   {idx: 0, num: 1, empty: false}, 
    //   {idx: 1, num: 2, empty: false}, 
    //   {idx: 2, num: 3, empty: false}, 
    //   {idx: 3, num: 4, empty: false}, 
    //   {idx: 4, num: 5, empty: false}, 
    //   {idx: 5, num: 6, empty: false}, 
    //   {idx: 6, num: 7, empty: false}, 
    //   {idx: 7, num: 8, empty: false}, 
    //   {idx: 8, num: 9, empty: false}, 
    //   {idx: 9, num: 10, empty: false}, 
    //   {idx: 10, num: 11, empty: false}, 
    //   {idx: 11, num: 12, empty: false}, 
    //   {idx: 12, num: 13, empty: false}, 
    //   {idx: 13, num: 14, empty: false},
    //   {idx: 14, num: 15, empty: false},
    //   {idx: 15, num: -1, empty: true}
  ];

  public allowedDirs: any[] = [
    // [2, 3], [2, 3, 4], [2, 3, 4], [3, 4], 
    // [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4], [1, 3, 4],
    // [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4], [1, 3, 4],
    // [1, 2], [1, 2, 4], [1, 2, 4], [1, 4]
  ];

  constructor(public server: ServerService) {
    this.generateBoard();
    this.allowedDirs = this.generateBoardDirs();
  }

  generateBoard() {
    for(let i = 0; i < this.rowLen * this.rowLen - 1; i++) {
      this.elements.push({idx: i, num: i + 1, empty: false});
    }
    this.elements.push({idx: this.rowLen * this.rowLen - 1, num: -1, empty: true});
  }

  generateBoardDirs() {
    const out = [];
    for(let i = 0; i < this.rowLen * this.rowLen; i++) { 
      const dirs = [];
      if(i >= this.rowLen )
        dirs.push(1);
      if((i + 1) % this.rowLen != 0)
        dirs.push(2);
      if(i < this.rowLen * (this.rowLen - 1))
        dirs.push(3);
      if (i % this.rowLen != 0)
        dirs.push(4);

      out.push(dirs);
    }
    return out;
  }

  OnClick(idx: number) {
    this.swapElements(idx);
  }

  OnClickNumber($event: any, idx: number) {
    this.swapElements(idx);
    $event.stopPropagation();
  }

  getEllement(idx: number): any {
    return this.elements.find((el)=>{
      return el.idx == idx;
    } );
    
  }

  getEmptyIdx(): number {
    const ret = this.elements.findIndex((el) => {
      return el.empty;
    });
    if (ret != undefined)
      return ret;
    return -1;
  }

  randomEllements() {
    let i = 0;   
    this.progressComp;

    const itemp = setInterval(() => {
      const idx = this.getEmptyIdx();
      const dirs = this.allowedDirs[idx];
      let dirIdx = Math.floor(Math.random() * dirs.length);
      const dir = dirs[dirIdx];

      let switchEl: Element | null = null;
      let emptyEl = this.elements[idx];
      switch(dir) {
        case 1:
          switchEl = this.elements[idx - this.rowLen];
          this.elements[idx - this.rowLen] = emptyEl;
          break;
        case 2:
          switchEl = this.elements[idx + 1];
          this.elements[idx + 1] = emptyEl;
          break;
        case 3:
          switchEl = this.elements[idx + this.rowLen];
          this.elements[idx + this.rowLen] = emptyEl; 
          break;
        case 4:
          switchEl = this.elements[idx - 1];
          this.elements[idx - 1] = emptyEl;
          break;
      }
      this.elements[idx] = switchEl;   
      i++;
      if(i > 200) {
        clearInterval(itemp);
        this.progress = 0;
        this.startPlaying();
      }
    }, 10);
}

  swapElements(idx: number) {
    const emptyIdx = this.getEmptyIdx();
    if(idx == emptyIdx) 
      return ;
    if((Math.abs(emptyIdx - idx) == 1) || (Math.abs(emptyIdx - idx) == this.rowLen)) {
      const swapEl = this.elements[idx];
      this.elements[idx] = this.elements[emptyIdx];
      this.elements[emptyIdx] = swapEl;
    }
    if(this.checkWinCombination()) {
      this.server.saveResult(this.counter).subscribe(() => {
        this.result.emit(this.counter);
      });
      this.stopPlaying();
    }
  }

  checkWinCombination(): boolean {
    for(let i = 0; i < this.rowLen * this.rowLen; i++) {
      if(this.elements[i].idx != i) {
        return false;
      }
    }
    return true;
  }
  startPlaying() {
    this.stopPlaying();
    this.counter = 0;
    this.play_timer = setInterval(() => {
      this.counter++;
    }, 1000);
  }
  stopPlaying() {
    if(this.play_timer) {
      clearInterval(this.play_timer);
      this.play_timer = null;
    }
  }
}

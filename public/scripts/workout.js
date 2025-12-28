'use strict';

class Workout {
  id = this.uniqueID();
  date = new Date();

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  uniqueID() {
    return Math.floor(Math.random() * Date.now());
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = `running`;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);

    this.cadence = cadence;
    this.pace = this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    return Math.trunc(this.duration / this.distance);
  }
}

class Cycling extends Workout {
  type = `cycling`;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);

    this.elevationGain = elevationGain;
    this.speed = this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    /* km/h */
    return Math.trunc(this.distance / this.duration);
  }
}

/* CONSTRUCTOR METHOD */
// function uniqueID() {
//   return Math.floor(Math.random() * Date.now())
// }
//
// function Workout(coords, distance, duration) {
//   this.date = new Date();
//   this.id = uniqueID();
//   this.coords = coords;
//   this.distance = distance;
//   this.duration = duration;
// }
//
// function Running(coords, distance, duration, cadence, pace) {
//   Workout.call(this, coords, distance, duration);
//   this.cadence = cadence;
//   this.pace = pace;
// }
//
// Running.prototype = Object.create(Workout.prototype);
// Running.prototype.constructor = Running;

// const workout = new Workout([43, 23], 34, 23);
// const running = new Running([23, 20], 32, 54, 90, 90);
//
// console.log(workout);
//
// console.log(running);

'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #editingMode = false;
  #currentWorkingID;
  #workoutMarker = new Map();

  constructor() {
    // Get from local storage after constructor method is called
    this._getLocalStorage();
    // when new app is created by constructor, it will load map and get current pos in the 1st place
    this._getPosition();
    // Attach event listener
    form.addEventListener('submit', this._handleFormSubmit.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    // Event delegation
    containerWorkouts.addEventListener('click', this._moveToCenter.bind(this));
    // Event delegation
    containerWorkouts.addEventListener(`click`, function (e) {
      if (e.target.classList.contains(`btn-edit`)) {
        app._enterEditMode(e);
      } else if (e.target.classList.contains(`btn-delete`)) {
        app._confirmDelete(e);
      }
    });
  }

  _confirmDelete(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return null;

    const workoutId = workoutEl.dataset.id;
    const confirmDelete = confirm(
      `Are you sure you want to delete this workout?`,
    );
    if (confirmDelete) {
      this._deleteWorkout(workoutId);
    }
  }

  _deleteWorkout(workoutId) {
    this.#workouts = this.#workouts.filter(workout => workout.id !== Number(workoutId));

    const marker = this.#workoutMarker.get(workoutId);
    if (marker) {
      this.#map.removeLayer(marker);
      this.#workoutMarker.delete(workoutId);
    }

    this._renderWorkouts();

    this._setLocalStorage();

    if (this.#map.hasEventListeners('click')) {
      this.#map.off('click');
      this.#map.addEventListener('click', this._showForm.bind(this));
    }
    alert(`Deleted workout ${workoutId}`);
  }

  // Enter edit mode when click edit button
  _enterEditMode(e) {
    const workoutEl = e.target.closest(`.workout`);
    if (!workoutEl) return null;

    this.#editingMode = true;
    this.#currentWorkingID = workoutEl.dataset.id;

    const currentWorkout = this.#workouts.find(
      workout => workout.id === Number(this.#currentWorkingID),
    );

    inputType.value = currentWorkout.type;
    inputDistance.value = currentWorkout.distance;
    inputDuration.value = currentWorkout.duration;
    currentWorkout.type === `running`
      ? (inputCadence.value = currentWorkout.cadence)
      : (inputElevation.value = currentWorkout.elevationGain);

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _handleFormSubmit(e) {
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value; // Convert string to number
    const duration = +inputDuration.value;

    if (this.#editingMode) {
      // Editing an existing workout
      this._updateWorkout(distance, duration, type);
    } else {
      // Adding a new workout
      this._addNewWorkout(distance, duration, type);
    }
    this._resetForm();
  }

  _updateWorkout(distance, duration, type) {
    let currentWorkout = this.#workouts.find(
      workout => workout.id === Number(this.#currentWorkingID),
    );

    currentWorkout.type = type;
    currentWorkout.duration = duration;
    currentWorkout.distance = distance;

    if (currentWorkout.type === `running`) {
      currentWorkout.cadence = +inputCadence.value;
    } else if (currentWorkout.type === `cycling`) {
      currentWorkout.elevationGain = +inputElevation.value;
    }
    // Render all workouts including newly updated workout
    this._renderWorkouts();
    // Update local storage
    this._setLocalStorage();
    // When the map’s DOM or its state is modified (e.g., removing it from the DOM or recreating it),
    // the event listeners attached to the original map object are not automatically reattached.
    // This can cause the click event on the map to stop working.
    // Reattach event listener
    this.#map.addEventListener('click', this._showForm.bind(this));

    alert(`Workouts updated successfully.`);
  }

  // Move the market when click on market list
  _moveToCenter(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const currentWorkout = this.#workouts.find(
      workout => workout.id === Number(workoutEl.dataset.id),
    );
    this.#map.flyTo(currentWorkout.coords, this.#mapZoomLevel);
  }

  _loadWorkoutMarkerFromStorage() {
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _getPosition() {
    const success = position => {
      const { latitude, longitude } = position.coords;
      const coords = [latitude, longitude];

      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);
      // Handling click on map
      this.#map.addEventListener('click', this._showForm.bind(this));
      // Load markers onto map after map loaded
      this._loadWorkoutMarkerFromStorage();
    };
    const error = () => alert('Could not get your position');

    navigator.geolocation?.getCurrentPosition(success, error);
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.reset();
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // clear input fields
    // inputDistance.value =
    //   inputDuration.value =
    //   inputCadence.value =
    //   inputElevation.value =
    //     ``;
    form.reset();

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = `grid`;
    }, 1000);
  }

  _resetForm() {
    form.classList.add('hidden');
    form.reset();
    this.#editingMode = false;
    this.#currentWorkingID = null;
  }

  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _addNewWorkout(distance, duration, type) {
    // Get data from the form
    const { lat, lng } = this.#mapEvent.latlng;

    const validateInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every(input => input > 0);

    // Refactor get cadence, elevationGain input
    // Refactor validate, create new object based on type
    const createWorkoutType = function (type) {
      const workoutConfig = {
        running: {
          getExtraInput: () => +inputCadence.value,
          validate: (distance, duration, cadence) => {
            return (
              validateInputs(distance, duration, cadence) &&
              allPositive(distance, duration, cadence)
            );
          },
          class: Running,
        },
        cycling: {
          getExtraInput: () => +inputElevation.value,
          validate: (distance, duration, elevationGain) => {
            return (
              validateInputs(distance, duration, elevationGain) &&
              allPositive(distance, duration)
            );
          },
          class: Cycling,
        },
      };

      const config = workoutConfig[type];
      const extraInput = config.getExtraInput();

      if (!config.validate(distance, duration, extraInput)) {
        alert(`Input must be a number or greater than 0.`);
        return null;
      }
      return new config.class([lat, lng], distance, duration, extraInput);
    };

    const workout = createWorkoutType(type);
    this.#workouts.push(workout);

    // Hide form
    this._hideForm();

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    alert(`New workout added!`);

    this._setLocalStorage();
  }

  // Render workout on map as marker
  _renderWorkoutMarker(workout) {
    const popupContent = {
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    };

    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup(popupContent))
      .setPopupContent(`${workout.description}`)
      .openPopup();

    this.#workoutMarker.set(workout.id, marker);
  }

  // Render workout on list
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${workout.type === `running` ? '🏃‍♂' : '🚴‍♀'}️</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === `running`) {
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      <div class="btn btn-edit">Edit</div>
      <div class="btn btn-delete">Delete</div>
    </li>
      `;
    } else if (workout.type === `cycling`) {
      html += `
       <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      <div class="btn btn-edit">Edit</div>
      <div class="btn btn-delete">Delete</div>
    </li>
        `;
    }
    containerWorkouts.insertAdjacentHTML('beforeend', html);
  }

  // Render all workouts
  _renderWorkouts() {
    // Clear all workout displayed
    containerWorkouts.innerHTML = ``;
    // Render workout
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
    // Prepend the form because it lost its parent after clear the container
    containerWorkouts.prepend(form);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return null;
    this.#workouts = data;
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }
}

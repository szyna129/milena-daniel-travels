import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

const STORAGE_KEY = "milena-daniel-travels-v2";

function id() {
  return crypto?.randomUUID?.() || String(Date.now() + Math.random());
}

function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function range(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e || s > e) return [];
  const out = [];
  const cur = new Date(s);
  while (cur <= e) {
    out.push(iso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function pretty(date) {
  const parsed = parseDate(date);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function normalizeUrl(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return "";
}

function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getNextDay(days, currentDay) {
  const index = days.indexOf(currentDay);
  if (index === -1 || index >= days.length - 1) return null;
  return days[index + 1];
}

const demoTrips = [
  {
    id: id(),
    title: "Rzym 2026",
    location: "Włochy",
    startDate: "2026-06-12",
    endDate: "2026-06-16",
    note: "Pierwszy szkic wspólnego city breaku.",
    updatedBy: "Daniel",
    days: {
      "2026-06-12": [
        {
          id: id(),
          time: "15:00",
          title: "Przylot i spacer po centrum",
          address: "https://www.booking.com",
          description: "Link do noclegu lub rezerwacji jest teraz klikalny.",
          completed: false,
          updatedBy: "Daniel"
        }
      ]
    }
  }
];

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem("mdt-user") || "Daniel");
  const [trips, setTrips] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || demoTrips;
    } catch {
      return demoTrips;
    }
  });

  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id || null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [tripForm, setTripForm] = useState({ title: "", location: "", startDate: "", endDate: "", note: "" });
  const [activityForm, setActivityForm] = useState({ time: "", title: "", address: "", description: "" });

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(trips)), [trips]);
  useEffect(() => localStorage.setItem("mdt-user", user), [user]);

  const selectedTrip = useMemo(() => trips.find((trip) => trip.id === selectedTripId) || trips[0], [trips, selectedTripId]);
  const days = useMemo(() => selectedTrip ? range(selectedTrip.startDate, selectedTrip.endDate) : [], [selectedTrip]);

  useEffect(() => {
    if (!selectedDay && days.length) setSelectedDay(days[0]);
    if (selectedDay && !days.includes(selectedDay)) setSelectedDay(days[0] || null);
  }, [days, selectedDay]);

  function addTrip(e) {
    e.preventDefault();
    if (!tripForm.title.trim() || !tripForm.startDate || !tripForm.endDate) {
      alert("Uzupełnij nazwę oraz daty podróży.");
      return;
    }
    if (range(tripForm.startDate, tripForm.endDate).length === 0) {
      alert("Data zakończenia nie może być wcześniejsza niż data startu.");
      return;
    }
    const trip = {
      id: id(),
      title: tripForm.title.trim(),
      location: tripForm.location.trim() || "Do ustalenia",
      startDate: tripForm.startDate,
      endDate: tripForm.endDate,
      note: tripForm.note.trim(),
      updatedBy: user,
      days: {}
    };
    setTrips([trip, ...trips]);
    setSelectedTripId(trip.id);
    setSelectedDay(trip.startDate);
    setTripForm({ title: "", location: "", startDate: "", endDate: "", note: "" });
    setShowTripForm(false);
  }

  function deleteTrip(tripId) {
    const next = trips.filter((trip) => trip.id !== tripId);
    setTrips(next);
    setSelectedTripId(next[0]?.id || null);
  }

  function saveActivity(e) {
    e.preventDefault();
    if (!selectedTrip || !selectedDay || !activityForm.title.trim()) return;
    const existing = (selectedTrip.days?.[selectedDay] || []).find((item) => item.id === editingActivityId);
    const activity = {
      id: editingActivityId || id(),
      time: activityForm.time,
      title: activityForm.title.trim(),
      address: activityForm.address.trim(),
      description: activityForm.description.trim(),
      completed: existing?.completed || false,
      updatedBy: user
    };
    setTrips((currentTrips) => currentTrips.map((trip) => {
      if (trip.id !== selectedTrip.id) return trip;
      const currentActivities = trip.days?.[selectedDay] || [];
      const nextActivities = editingActivityId
        ? currentActivities.map((item) => item.id === editingActivityId ? activity : item)
        : [...currentActivities, activity];
      return { ...trip, updatedBy: user, days: { ...trip.days, [selectedDay]: nextActivities } };
    }));
    setEditingActivityId(null);
    setShowActivityForm(false);
    setActivityForm({ time: "", title: "", address: "", description: "" });
  }

  function editActivity(activity) {
    setEditingActivityId(activity.id);
    setShowActivityForm(true);
    setActivityForm({
      time: activity.time || "",
      title: activity.title || "",
      address: activity.address || "",
      description: activity.description || ""
    });
  }

  function deleteActivity(activityId) {
    setTrips((currentTrips) => currentTrips.map((trip) => {
      if (trip.id !== selectedTrip.id) return trip;
      return { ...trip, updatedBy: user, days: { ...trip.days, [selectedDay]: (trip.days?.[selectedDay] || []).filter((item) => item.id !== activityId) } };
    }));
  }

  function toggleCompleted(activityId) {
    setTrips((currentTrips) => currentTrips.map((trip) => {
      if (trip.id !== selectedTrip.id) return trip;
      return {
        ...trip,
        updatedBy: user,
        days: {
          ...trip.days,
          [selectedDay]: (trip.days?.[selectedDay] || []).map((item) =>
            item.id === activityId ? { ...item, completed: !item.completed, updatedBy: user } : item
          )
        }
      };
    }));
  }

  function moveActivityToNextDay(activity) {
    const nextDay = getNextDay(days, selectedDay);
    if (!nextDay) {
      alert("To jest ostatni dzień podróży — nie ma kolejnego dnia.");
      return;
    }
    setTrips((currentTrips) => currentTrips.map((trip) => {
      if (trip.id !== selectedTrip.id) return trip;
      return {
        ...trip,
        updatedBy: user,
        days: {
          ...trip.days,
          [selectedDay]: (trip.days?.[selectedDay] || []).filter((item) => item.id !== activity.id),
          [nextDay]: [...(trip.days?.[nextDay] || []), { ...activity, completed: false, updatedBy: user }]
        }
      };
    }));
  }

  function cancelEditing() {
    setEditingActivityId(null);
    setShowActivityForm(false);
    setActivityForm({ time: "", title: "", address: "", description: "" });
  }

  function openNewActivityForm() {
    setEditingActivityId(null);
    setActivityForm({ time: "", title: "", address: "", description: "" });
    setShowActivityForm((current) => !current);
  }

  const activities = selectedTrip && selectedDay
    ? [...(selectedTrip.days?.[selectedDay] || [])].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
    : [];
  const doneCount = activities.filter((item) => item.completed).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand-pill">✈️ Private travel planner</div>
        <h1>Milena & Daniel Travels</h1>
        <p className="subtitle">Minimalistyczny planer Waszych wspólnych podróży.</p>

        <div className="card compact">
          <strong>Kto teraz planuje?</strong>
          <div className="switch">
            {["Daniel", "Milena"].map((name) => (
              <button key={name} className={user === name ? "active" : ""} onClick={() => setUser(name)}>{name}</button>
            ))}
          </div>
        </div>

        <div className="cloud-note">
          <strong>Na razie zapis lokalny</strong>
          <span>Po testach dołożymy Firebase, żeby dane synchronizowały się między Wami.</span>
        </div>

        <button className="primary" onClick={() => setShowTripForm(!showTripForm)}>+ Dodaj podróż</button>

        {showTripForm && (
          <form className="card form" onSubmit={addTrip}>
            <input placeholder="Nazwa, np. Paryż 2027" value={tripForm.title} onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })} />
            <input placeholder="Miejsce / kraj" value={tripForm.location} onChange={(e) => setTripForm({ ...tripForm, location: e.target.value })} />
            <div className="row">
              <input type="date" value={tripForm.startDate} onChange={(e) => setTripForm({ ...tripForm, startDate: e.target.value })} />
              <input type="date" value={tripForm.endDate} onChange={(e) => setTripForm({ ...tripForm, endDate: e.target.value })} />
            </div>
            <textarea placeholder="Krótka notatka" value={tripForm.note} onChange={(e) => setTripForm({ ...tripForm, note: e.target.value })} />
            <button className="dark">Zapisz podróż</button>
          </form>
        )}

        <div className="trip-list">
          {trips.map((trip) => (
            <button key={trip.id} className={`trip-card ${selectedTrip?.id === trip.id ? "selected" : ""}`} onClick={() => { setSelectedTripId(trip.id); setSelectedDay(range(trip.startDate, trip.endDate)[0] || null); setShowActivityForm(false); setEditingActivityId(null); }}>
              <strong>{trip.title}</strong>
              <span>📍 {trip.location}</span>
              <span>🗓️ {pretty(trip.startDate)} — {pretty(trip.endDate)}</span>
              {trip.updatedBy && <small>Ostatnio edytował(a): {trip.updatedBy}</small>}
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        {!selectedTrip ? (
          <div className="empty"><h2>Dodaj pierwszą podróż</h2><p>Po dodaniu podróży pojawi się tutaj plan dzień po dniu.</p></div>
        ) : (
          <>
            <section className="hero">
              <div className="hero-content">
                <span className="pill">{days.length} dni podróży</span>
                <h2>{selectedTrip.title}</h2>
                <p>{selectedTrip.note || "Plan wspólnej podróży, dzień po dniu."}</p>
              </div>
              <button className="ghost" onClick={() => deleteTrip(selectedTrip.id)}>Usuń</button>
            </section>

            <section className="planner">
              <div className="days">
                <h3>Dni podróży</h3>
                {days.map((day, index) => {
                  const dayActivities = selectedTrip.days?.[day] || [];
                  const dayDone = dayActivities.filter((item) => item.completed).length;
                  return (
                    <button key={day} className={selectedDay === day ? "active" : ""} onClick={() => { setSelectedDay(day); setShowActivityForm(false); setEditingActivityId(null); }}>
                      <small>Dzień {index + 1}</small>
                      <span>{pretty(day)}</span>
                      <em>{dayDone}/{dayActivities.length} wykonane</em>
                    </button>
                  );
                })}
              </div>

              <div className="day-plan">
                <div className="day-header">
                  <div>
                    <h3>Plan dnia</h3>
                    <p className="muted">{pretty(selectedDay)}</p>
                  </div>
                  <div className="progress-pill">{doneCount}/{activities.length} wykonane</div>
                </div>

                <div className="add-activity-bar">
                  <button className="primary add-day-button" onClick={openNewActivityForm}>
                    {showActivityForm && !editingActivityId ? "Zamknij formularz" : "+ Dodaj do dnia"}
                  </button>
                </div>

                {showActivityForm && (
                  <form className="activity-form" onSubmit={saveActivity}>
                    <input type="time" value={activityForm.time} onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })} />
                    <input placeholder="Atrakcja / miejsce" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} />
                    <input className="full" placeholder="Adres, link Google Maps, Booking, bilety..." value={activityForm.address} onChange={(e) => setActivityForm({ ...activityForm, address: e.target.value })} />
                    <textarea className="full" placeholder="Opis, notatka, koszt, rezerwacja..." value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} />
                    <div className="form-actions full">
                      <button className="dark">{editingActivityId ? "Zapisz zmiany" : "Dodaj do dnia"}</button>
                      <button type="button" className="light" onClick={cancelEditing}>Anuluj</button>
                    </div>
                  </form>
                )}

                <div className="activities">
                  {activities.length === 0 ? <div className="empty-small">Ten dzień jest jeszcze pusty. Kliknij „Dodaj do dnia”, aby dodać pierwszą atrakcję.</div> : activities.map((activity) => {
                    const url = normalizeUrl(activity.address);
                    const mapsUrl = activity.address && !url ? googleMapsUrl(activity.address) : "";
                    return (
                      <article className={`activity ${activity.completed ? "completed" : ""}`} key={activity.id}>
                        <div className="activity-main">
                          <button className={`check ${activity.completed ? "checked" : ""}`} onClick={() => toggleCompleted(activity.id)} title={activity.completed ? "Oznacz jako niewykonane" : "Oznacz jako wykonane"}>
                            {activity.completed ? "✓" : ""}
                          </button>
                          <div>
                            <span className="time">{activity.time || "bez godziny"}</span>
                            <h4>{activity.title}</h4>
                            {activity.address && (
                              <div className="link-row">
                                {url ? <a href={url} target="_blank" rel="noreferrer">Otwórz link ↗</a> : <a href={mapsUrl} target="_blank" rel="noreferrer">Otwórz w Google Maps ↗</a>}
                                <span>{activity.address}</span>
                              </div>
                            )}
                            {activity.description && <p>{activity.description}</p>}
                            {activity.updatedBy && <small>Ostatnio edytował(a): {activity.updatedBy}</small>}
                          </div>
                        </div>
                        <div className="actions">
                          <button onClick={() => editActivity(activity)}>Edytuj</button>
                          <button onClick={() => moveActivityToNextDay(activity)}>Na kolejny dzień</button>
                          <button onClick={() => deleteActivity(activity.id)}>Usuń</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

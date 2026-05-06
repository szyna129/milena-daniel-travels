
import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import "./index.css";

const STORAGE_KEY = "milena-daniel-travels-v10-firebase";

const firebaseConfig = {
  apiKey: "AIzaSyATGqAHC4jy3uGUHwdx8wth-VhaFPD3Xlc",
  authDomain: "milena-daniel-travels.firebaseapp.com",
  projectId: "milena-daniel-travels",
  storageBucket: "milena-daniel-travels.firebasestorage.app",
  messagingSenderId: "805076809980",
  appId: "1:805076809980:web:051c070268a2a0f6f0bf79"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const sharedDocRef = doc(db, "shared", "milena-daniel-travels");

const EXTRA_SECTIONS = [
  { id: "costs", icon: "📊", title: "Szacunkowe koszty", subtitle: "Szybka estymacja kosztów wyjazdu." },
  { id: "checklists", icon: "🧳", title: "Checklisty", subtitle: "Rzeczy do spakowania i przygotowania." },
  { id: "reservations", icon: "📑", title: "Rezerwacje", subtitle: "Hotele, bilety, parkingi i linki." },
  { id: "nearby", icon: "📍", title: "Sprawdź w okolicy", subtitle: "Szybkie wyszukiwania w Google Maps." },
  { id: "memories", icon: "📸", title: "Wspomnienia", subtitle: "Miejsce na zdjęcia i notatki po podróży." }
];

const CHECKLIST_CATEGORIES = ["Dokumenty", "Ubrania", "Elektronika", "Auto", "Pies", "Inne"];
const RESERVATION_TYPES = ["Hotel", "Lot", "Pociąg", "Parking", "Bilet", "Restauracja", "Inne"];

function makeChecklistItems(items) {
  return items.map((text) => ({ id: id(), text, done: false }));
}

function createDefaultChecklists() {
  return {
    Dokumenty: makeChecklistItems([
      "Dowody osobiste / paszporty",
      "Prawo jazdy",
      "Dowód rejestracyjny auta",
      "Ubezpieczenie podróżne",
      "Europejska Karta EKUZ",
      "Potwierdzenia rezerwacji",
      "Bilety / vouchery",
      "Gotówka i karta płatnicza"
    ]),
    Ubrania: makeChecklistItems([
      "Bielizna i skarpetki",
      "Koszulki / bluzy",
      "Spodnie / krótkie spodenki",
      "Kurtka przeciwdeszczowa",
      "Wygodne buty",
      "Piżama",
      "Strój kąpielowy",
      "Czapka / okulary przeciwsłoneczne"
    ]),
    Elektronika: makeChecklistItems([
      "Ładowarki do telefonów",
      "Powerbank",
      "Słuchawki",
      "Adapter do gniazdka",
      "Aparat / kamera",
      "Kable USB",
      "Uchwyt samochodowy",
      "Pobrane mapy offline"
    ]),
    Auto: makeChecklistItems([
      "Sprawdzić ciśnienie w oponach",
      "Sprawdzić poziom oleju",
      "Sprawdzić płyn do spryskiwaczy",
      "Zatankować auto",
      "Kamizelka odblaskowa",
      "Trójkąt ostrzegawczy",
      "Winiety / opłaty drogowe",
      "Dokumenty auta"
    ]),
    Pies: makeChecklistItems([
      "Karma",
      "Miska",
      "Woda na drogę",
      "Smycz i obroża",
      "Szelki",
      "Woreczki na odchody",
      "Koc / legowisko",
      "Ręcznik dla psa",
      "Książeczka zdrowia / szczepienia",
      "Ulubiona zabawka"
    ]),
    Inne: makeChecklistItems([
      "Kosmetyczka",
      "Leki",
      "Apteczka",
      "Chusteczki / mokre chusteczki",
      "Plecak na zwiedzanie",
      "Butelka na wodę",
      "Lista atrakcji",
      "Plan awaryjny na deszcz"
    ])
  };
}

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

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

function sumReservations(trip) {
  return (trip?.reservations || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);
}

function ensureChecklist(trip) {
  return trip?.checklists || {};
}

const demoTrips = [
  {
    id: id(),
    title: "Rzym 2026",
    location: "Włochy",
    startDate: "2026-06-12",
    endDate: "2026-06-16",
    note: "Pierwszy szkic wspólnego city breaku.",
    coverImage: "",
    updatedBy: "Wspólnie",
    reservations: [],
    checklists: createDefaultChecklists(),
    costs: { km: 3000, days: 5, people: 2, fuelPrice: 6.5, breakfastIncluded: true, standard: "standard", transport: "car" },
    days: {
      "2026-06-12": [
        {
          id: id(),
          time: "15:00",
          title: "Przylot i spacer po centrum",
          address: "https://www.booking.com",
          description: "Link do noclegu lub rezerwacji jest klikalny.",
          completed: false,
          updatedBy: "Wspólnie"
        }
      ]
    }
  }
];

function SectionShell({ activeExtra, onBack, children }) {
  return (
    <section className="extra-panel">
      <button className="back-button" onClick={onBack}>← Wróć do planu dnia</button>
      <div className="extra-header">
        <span>{activeExtra.icon}</span>
        <div>
          <h2>{activeExtra.title}</h2>
          <p>{activeExtra.subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [syncStatus, setSyncStatus] = useState("Łączenie z chmurą...");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const lastSavedSignatureRef = useRef("");
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
  const [showTripMenu, setShowTripMenu] = useState(false);
  const [activeSection, setActiveSection] = useState("plan");
  const [showCoverForm, setShowCoverForm] = useState(false);
  const [coverImageInput, setCoverImageInput] = useState("");

  const [reservationForm, setReservationForm] = useState({ type: "Hotel", name: "", date: "", link: "", cost: "", note: "" });
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [checklistForm, setChecklistForm] = useState({ category: "Dokumenty", text: "" });
  const [activeChecklistCategory, setActiveChecklistCategory] = useState("Dokumenty");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      sharedDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const cloudTrips = snapshot.data()?.trips;
          if (Array.isArray(cloudTrips)) {
            const signature = JSON.stringify(cloudTrips);
            lastSavedSignatureRef.current = signature;
            setTrips(cloudTrips);
            localStorage.setItem(STORAGE_KEY, signature);
          }
          setSyncStatus("Zapis w chmurze aktywny");
          setCloudLoaded(true);
        } else {
          await setDoc(sharedDocRef, {
            trips,
            updatedAt: serverTimestamp()
          });
          lastSavedSignatureRef.current = JSON.stringify(trips);
          setSyncStatus("Utworzono wspólną bazę podróży");
          setCloudLoaded(true);
        }
      },
      (error) => {
        console.error(error);
        setSyncStatus("Błąd synchronizacji — sprawdź reguły Firestore");
        setCloudLoaded(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!cloudLoaded) return;

    const signature = JSON.stringify(trips);
    if (signature === lastSavedSignatureRef.current) return;

    const timeout = setTimeout(async () => {
      try {
        await setDoc(sharedDocRef, {
          trips,
          updatedAt: serverTimestamp()
        }, { merge: true });
        lastSavedSignatureRef.current = signature;
        setSyncStatus("Zapisano w chmurze");
      } catch (error) {
        console.error(error);
        setSyncStatus("Nie udało się zapisać w chmurze");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [trips, cloudLoaded]);

  const selectedTrip = useMemo(() => trips.find((trip) => trip.id === selectedTripId) || trips[0], [trips, selectedTripId]);
  const days = useMemo(() => selectedTrip ? range(selectedTrip.startDate, selectedTrip.endDate) : [], [selectedTrip]);

  useEffect(() => {
    if (!selectedDay && days.length) setSelectedDay(days[0]);
    if (selectedDay && !days.includes(selectedDay)) setSelectedDay(days[0] || null);
  }, [days, selectedDay]);

  function updateTrip(updater) {
    setTrips((current) => current.map((trip) => {
      if (trip.id !== selectedTrip.id) return trip;
      const nextTrip = updater(trip);
      return { ...nextTrip, updatedBy: "Wspólnie" };
    }));
  }

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
    const tripDays = range(tripForm.startDate, tripForm.endDate);
    const trip = {
      id: id(),
      title: tripForm.title.trim(),
      location: tripForm.location.trim() || "Do ustalenia",
      startDate: tripForm.startDate,
      endDate: tripForm.endDate,
      note: tripForm.note.trim(),
      coverImage: "",
      updatedBy: "Wspólnie",
      reservations: [],
      checklists: createDefaultChecklists(),
      costs: { km: "", days: tripDays.length, people: 2, fuelPrice: 6.5, breakfastIncluded: false, standard: "standard", transport: "car" },
      days: {}
    };
    setTrips([trip, ...trips]);
    setSelectedTripId(trip.id);
    setSelectedDay(trip.startDate);
    setActiveSection("plan");
    setTripForm({ title: "", location: "", startDate: "", endDate: "", note: "" });
    setShowTripForm(false);
  }

  function deleteTrip(tripId) {
    const tripToDelete = trips.find((trip) => trip.id === tripId);
    const tripName = tripToDelete?.title || "tę podróż";
    const confirmDelete = window.confirm(`Czy na pewno chcesz usunąć podróż „${tripName}”?`);

    if (!confirmDelete) return;

    const next = trips.filter((trip) => trip.id !== tripId);
    setTrips(next);
    setSelectedTripId(next[0]?.id || null);
    setActiveSection("plan");
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
      updatedBy: "Wspólnie"
    };
    updateTrip((trip) => {
      const currentActivities = trip.days?.[selectedDay] || [];
      const nextActivities = editingActivityId
        ? currentActivities.map((item) => item.id === editingActivityId ? activity : item)
        : [...currentActivities, activity];
      return { ...trip, days: { ...trip.days, [selectedDay]: nextActivities } };
    });
    setEditingActivityId(null);
    setShowActivityForm(false);
    setActivityForm({ time: "", title: "", address: "", description: "" });
  }

  function editActivity(activity) {
    setEditingActivityId(activity.id);
    setShowActivityForm(true);
    setActivityForm({ time: activity.time || "", title: activity.title || "", address: activity.address || "", description: activity.description || "" });
  }

  function deleteActivity(activityId) {
    updateTrip((trip) => ({ ...trip, days: { ...trip.days, [selectedDay]: (trip.days?.[selectedDay] || []).filter((item) => item.id !== activityId) } }));
  }

  function toggleCompleted(activityId) {
    updateTrip((trip) => ({
      ...trip,
      days: {
        ...trip.days,
        [selectedDay]: (trip.days?.[selectedDay] || []).map((item) =>
          item.id === activityId ? { ...item, completed: !item.completed, updatedBy: "Wspólnie" } : item
        )
      }
    }));
  }

  function moveActivityToNextDay(activity) {
    const nextDay = getNextDay(days, selectedDay);
    if (!nextDay) {
      alert("To jest ostatni dzień podróży — nie ma kolejnego dnia.");
      return;
    }
    updateTrip((trip) => ({
      ...trip,
      days: {
        ...trip.days,
        [selectedDay]: (trip.days?.[selectedDay] || []).filter((item) => item.id !== activity.id),
        [nextDay]: [...(trip.days?.[nextDay] || []), { ...activity, completed: false, updatedBy: "Wspólnie" }]
      }
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

  function openSection(sectionId) {
    setActiveSection(sectionId);
    setShowTripMenu(false);
    setShowActivityForm(false);
    setEditingActivityId(null);
  }

  function openCoverForm() {
    setCoverImageInput(selectedTrip?.coverImage || "");
    setShowTripMenu(false);
    setShowCoverForm(true);
  }

  function saveCoverImage(e) {
    e.preventDefault();
    updateTrip((trip) => ({
      ...trip,
      coverImage: coverImageInput.trim()
    }));
    setShowCoverForm(false);
  }

  function removeCoverImage() {
    updateTrip((trip) => ({
      ...trip,
      coverImage: ""
    }));
    setCoverImageInput("");
    setShowCoverForm(false);
  }

  function saveReservation(e) {
    e.preventDefault();
    if (!reservationForm.name.trim()) return;
    const item = {
      id: id(),
      type: reservationForm.type,
      name: reservationForm.name.trim(),
      date: reservationForm.date,
      link: reservationForm.link.trim(),
      cost: Number(reservationForm.cost || 0),
      note: reservationForm.note.trim(),
      updatedBy: "Wspólnie"
    };
    updateTrip((trip) => ({ ...trip, reservations: [...(trip.reservations || []), item] }));
    setReservationForm({ type: "Hotel", name: "", date: "", link: "", cost: "", note: "" });
    setShowReservationForm(false);
  }

  function deleteReservation(reservationId) {
    updateTrip((trip) => ({ ...trip, reservations: (trip.reservations || []).filter((item) => item.id !== reservationId) }));
  }

  function saveChecklistItem(e) {
    e.preventDefault();
    if (!checklistForm.text.trim()) return;
    const item = { id: id(), text: checklistForm.text.trim(), done: false, updatedBy: "Wspólnie" };
    updateTrip((trip) => {
      const current = ensureChecklist(trip);
      const categoryItems = current[checklistForm.category] || [];
      return { ...trip, checklists: { ...current, [checklistForm.category]: [...categoryItems, item] } };
    });
    setChecklistForm({ ...checklistForm, text: "" });
  }

  function toggleChecklist(category, itemId) {
    updateTrip((trip) => {
      const current = ensureChecklist(trip);
      return {
        ...trip,
        checklists: {
          ...current,
          [category]: (current[category] || []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item)
        }
      };
    });
  }

  function deleteChecklistItem(category, itemId) {
    updateTrip((trip) => {
      const current = ensureChecklist(trip);
      return { ...trip, checklists: { ...current, [category]: (current[category] || []).filter((item) => item.id !== itemId) } };
    });
  }

  function updateCosts(field, value) {
    updateTrip((trip) => ({ ...trip, costs: { ...(trip.costs || {}), [field]: value } }));
  }

  const activities = selectedTrip && selectedDay
    ? [...(selectedTrip.days?.[selectedDay] || [])].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
    : [];
  const doneCount = activities.filter((item) => item.completed).length;
  const activeExtra = EXTRA_SECTIONS.find((section) => section.id === activeSection);
  const reservationTotal = sumReservations(selectedTrip);
  const costs = selectedTrip?.costs || {};
  const tripDaysCount = days.length || Number(costs.days || 0) || 1;

  const fuelCost = (costs.transport || "car") === "car" ? (Number(costs.km || 0) / 100 * 6 * Number(costs.fuelPrice || 0)) : 0;
  const standardMultipliers = { budget: 0.8, standard: 1, comfort: 1.35 };
  const mealBase = costs.breakfastIncluded ? 95 : 125;
  const foodCost = tripDaysCount * Number(costs.people || 1) * mealBase * (standardMultipliers[costs.standard || "standard"] || 1);
  const attractionsCost = tripDaysCount * Number(costs.people || 1) * 70 * (standardMultipliers[costs.standard || "standard"] || 1);
  const baseEstimatedTotal = fuelCost + foodCost + attractionsCost + reservationTotal;
  const estimateMin = Math.round(baseEstimatedTotal * 0.9);
  const estimateMax = Math.round(baseEstimatedTotal * 1.2);

  return (
    <div className="app">
      <aside
        className="sidebar"
        style={selectedTrip?.coverImage ? { "--sidebar-cover": `url("${selectedTrip.coverImage}")` } : undefined}
      >
        <div className="sidebar-cover-bg" />
        <div className="brand-pill">✈️ Private travel planner</div>
        <h1>Milena & Daniel Travels</h1>
        <p className="subtitle">Minimalistyczny planer Waszych wspólnych podróży.</p>

        <div className="sync-pill">
          <span>☁️</span>
          <div>
            <strong>Wspólna chmura</strong>
            <small>{syncStatus}</small>
          </div>
        </div>

        <button className="primary" onClick={() => setShowTripForm(!showTripForm)}>+ Dodaj podróż</button>

        {showTripForm && (
          <form className="card form" onSubmit={addTrip}>
            <input placeholder="Nazwa, np. Budapeszt 2026" value={tripForm.title} onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })} />
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
            <button key={trip.id} className={`trip-card ${selectedTrip?.id === trip.id ? "selected" : ""}`} onClick={() => { setSelectedTripId(trip.id); setSelectedDay(range(trip.startDate, trip.endDate)[0] || null); setShowActivityForm(false); setEditingActivityId(null); setActiveSection("plan"); }}>
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
            <section
              className="hero"
              style={selectedTrip.coverImage ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.68),rgba(0,0,0,.32),rgba(0,0,0,.14)), url("${selectedTrip.coverImage}")` } : undefined}
            >
              <div className="hero-content">
                <span className="pill">{days.length} dni podróży</span>
                <h2>{selectedTrip.title}</h2>
                <p>{selectedTrip.note || "Plan wspólnej podróży, dzień po dniu."}</p>
              </div>

              <div className="hero-actions">
                <div className="menu-wrap">
                  <button className="menu-button" onClick={() => setShowTripMenu((current) => !current)} aria-label="Menu podróży">⋯</button>
                  {showTripMenu && (
                    <div className="trip-menu">
                      <button onClick={() => openSection("plan")}>🗓️ Plan dnia</button>
                      {EXTRA_SECTIONS.map((section) => (
                        <button key={section.id} onClick={() => openSection(section.id)}>{section.icon} {section.title}</button>
                      ))}

                      <button onClick={openCoverForm}>🖼️ Zmień zdjęcie podróży</button>

                      <div className="trip-menu-divider" />

                      <button
                        className="danger-menu-item"
                        onClick={() => {
                          setShowTripMenu(false);
                          deleteTrip(selectedTrip.id);
                        }}
                      >
                        🗑️ Usuń podróż
                      </button>
                    </div>
                  )}
                </div>
                <button className="ghost" onClick={() => deleteTrip(selectedTrip.id)}>Usuń</button>
              </div>
            </section>

            {showCoverForm && (
              <div className="cover-modal-backdrop" onClick={() => setShowCoverForm(false)}>
                <form className="cover-modal" onSubmit={saveCoverImage} onClick={(e) => e.stopPropagation()}>
                  <div>
                    <h3>Zdjęcie podróży</h3>
                    <p>Wklej link do zdjęcia z internetu. To zdjęcie stanie się tłem tej podróży.</p>
                  </div>

                  <input
                    autoFocus
                    placeholder="https://..."
                    value={coverImageInput}
                    onChange={(e) => setCoverImageInput(e.target.value)}
                  />

                  {coverImageInput.trim() && (
                    <div className="cover-preview" style={{ backgroundImage: `url("${coverImageInput.trim()}")` }} />
                  )}

                  <div className="cover-actions">
                    <button className="dark">Zapisz zdjęcie</button>
                    <button type="button" className="light" onClick={() => setShowCoverForm(false)}>Anuluj</button>
                    {selectedTrip.coverImage && <button type="button" className="remove-cover" onClick={removeCoverImage}>Usuń zdjęcie</button>}
                  </div>
                </form>
              </div>
            )}

            {activeSection === "costs" && activeExtra && (
              <SectionShell activeExtra={activeExtra} onBack={() => setActiveSection("plan")}>
                <div className="cost-layout">
                  <form className="module-form">
                    <label>Transport
                      <select value={costs.transport || "car"} onChange={(e) => updateCosts("transport", e.target.value)}>
                        <option value="car">Samochód</option>
                        <option value="train">Pociąg / autobus</option>
                        <option value="plane">Samolot</option>
                      </select>
                    </label>
                    <label>Kilometry w obie strony
                      <input type="number" min="0" value={costs.km || ""} onChange={(e) => updateCosts("km", e.target.value)} placeholder="np. 3000" />
                    </label>
                    <label>Cena paliwa PLN/l
                      <input type="number" min="0" step="0.01" value={costs.fuelPrice || ""} onChange={(e) => updateCosts("fuelPrice", e.target.value)} placeholder="np. 6.50" />
                    </label>
                    <label>Liczba osób
                      <input type="number" min="1" value={costs.people || 2} onChange={(e) => updateCosts("people", e.target.value)} />
                    </label>
                    <label>Standard
                      <select value={costs.standard || "standard"} onChange={(e) => updateCosts("standard", e.target.value)}>
                        <option value="budget">Oszczędnie</option>
                        <option value="standard">Średnio</option>
                        <option value="comfort">Komfortowo</option>
                      </select>
                    </label>
                    <label className="checkbox-row">
                      <input type="checkbox" checked={Boolean(costs.breakfastIncluded)} onChange={(e) => updateCosts("breakfastIncluded", e.target.checked)} />
                      Śniadanie w hotelu
                    </label>
                  </form>

                  <div className="cost-summary">
                    <p className="summary-label">Szacunkowy koszt wycieczki</p>
                    <h3>{money(estimateMin)} – {money(estimateMax)}</h3>
                    <div className="summary-lines">
                      <span>Paliwo: <strong>{money(fuelCost)}</strong></span>
                      <span>Jedzenie: <strong>{money(foodCost)}</strong></span>
                      <span>Atrakcje / zapas: <strong>{money(attractionsCost)}</strong></span>
                      <span>Rezerwacje: <strong>{money(reservationTotal)}</strong></span>
                    </div>
                    <p className="hint">Założenie: Skoda, spalanie 6 l / 100 km. To szybki szacunek, nie dokładny budżet.</p>
                  </div>
                </div>
              </SectionShell>
            )}

            {activeSection === "reservations" && activeExtra && (
              <SectionShell activeExtra={activeExtra} onBack={() => setActiveSection("plan")}>
                <div className="add-activity-bar">
                  <button className="primary add-day-button" onClick={() => setShowReservationForm((current) => !current)}>
                    {showReservationForm ? "Zamknij formularz" : "+ Dodaj rezerwację"}
                  </button>
                </div>

                {showReservationForm && (
                  <form className="module-form reservation-form" onSubmit={saveReservation}>
                    <select value={reservationForm.type} onChange={(e) => setReservationForm({ ...reservationForm, type: e.target.value })}>
                      {RESERVATION_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    <input placeholder="Nazwa, np. Hotel Astoria" value={reservationForm.name} onChange={(e) => setReservationForm({ ...reservationForm, name: e.target.value })} />
                    <input type="date" value={reservationForm.date} onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })} />
                    <input type="number" min="0" placeholder="Koszt PLN" value={reservationForm.cost} onChange={(e) => setReservationForm({ ...reservationForm, cost: e.target.value })} />
                    <input className="wide" placeholder="Link do rezerwacji / biletu" value={reservationForm.link} onChange={(e) => setReservationForm({ ...reservationForm, link: e.target.value })} />
                    <textarea className="wide" placeholder="Notatka" value={reservationForm.note} onChange={(e) => setReservationForm({ ...reservationForm, note: e.target.value })} />
                    <div className="form-actions wide">
                      <button className="dark">Dodaj rezerwację</button>
                      <button type="button" className="light" onClick={() => setShowReservationForm(false)}>Anuluj</button>
                    </div>
                  </form>
                )}

                <div className="module-list">
                  {(selectedTrip.reservations || []).length === 0 ? <div className="empty-small">Brak rezerwacji. Dodaj hotel, bilet albo parking.</div> : selectedTrip.reservations.map((item) => {
                    const url = normalizeUrl(item.link);
                    return (
                      <article className="module-card" key={item.id}>
                        <div>
                          <span className="tag">{item.type}</span>
                          <h3>{item.name}</h3>
                          <p>{item.date ? pretty(item.date) : "bez daty"} · {money(item.cost)}</p>
                          {item.link && <p>{url ? <a href={url} target="_blank" rel="noreferrer">Otwórz link ↗</a> : item.link}</p>}
                          {item.note && <p>{item.note}</p>}
                        </div>
                        <button onClick={() => deleteReservation(item.id)}>Usuń</button>
                      </article>
                    );
                  })}
                </div>
              </SectionShell>
            )}

            {activeSection === "checklists" && activeExtra && (
              <SectionShell activeExtra={activeExtra} onBack={() => setActiveSection("plan")}>
                <div className="category-tabs">
                  {CHECKLIST_CATEGORIES.map((category) => {
                    const items = ensureChecklist(selectedTrip)[category] || [];
                    const done = items.filter((item) => item.done).length;
                    return (
                      <button
                        key={category}
                        className={activeChecklistCategory === category ? "active" : ""}
                        onClick={() => {
                          setActiveChecklistCategory(category);
                          setChecklistForm({ ...checklistForm, category });
                        }}
                      >
                        {category}
                        <span>{done}/{items.length}</span>
                      </button>
                    );
                  })}
                </div>

                <form className="module-form checklist-add" onSubmit={saveChecklistItem}>
                  <input
                    placeholder={`Dodaj do kategorii: ${activeChecklistCategory}`}
                    value={checklistForm.text}
                    onChange={(e) => setChecklistForm({ ...checklistForm, category: activeChecklistCategory, text: e.target.value })}
                  />
                  <button className="dark">Dodaj</button>
                </form>

                <div className="checklist-grid single">
                  {(() => {
                    const category = activeChecklistCategory;
                    const items = ensureChecklist(selectedTrip)[category] || [];
                    const done = items.filter((item) => item.done).length;
                    return (
                      <div className="checklist-box" key={category}>
                        <h3>{category}</h3>
                        <p>{done}/{items.length} gotowe</p>
                        {items.length === 0 ? <span className="mini-empty">Brak pozycji</span> : items.map((item) => (
                          <div className="checklist-item" key={item.id}>
                            <button className={`mini-check ${item.done ? "done" : ""}`} onClick={() => toggleChecklist(category, item.id)}>{item.done ? "✓" : ""}</button>
                            <span className={item.done ? "done-text" : ""}>{item.text}</span>
                            <button className="tiny-delete" onClick={() => deleteChecklistItem(category, item.id)}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </SectionShell>
            )}

            {activeSection === "nearby" && activeExtra && (
              <SectionShell activeExtra={activeExtra} onBack={() => setActiveSection("plan")}>
                <div className="nearby-grid">
                  {[
                    ["Atrakcje w okolicy", "attractions near me"],
                    ["Restauracje w okolicy", "restaurants near me"],
                    ["Kawiarnie w okolicy", "cafes near me"],
                    ["Parking w okolicy", "parking near me"],
                    ["Punkty widokowe", "viewpoints near me"],
                    ["Sklepy spożywcze", "grocery stores near me"]
                  ].map(([label, query]) => (
                    <a key={label} className="nearby-card" href={googleMapsUrl(query)} target="_blank" rel="noreferrer">
                      <strong>{label}</strong>
                      <span>Otwórz Google Maps ↗</span>
                    </a>
                  ))}
                </div>
              </SectionShell>
            )}

            {activeSection === "memories" && activeExtra && (
              <SectionShell activeExtra={activeExtra} onBack={() => setActiveSection("plan")}>
                <div className="placeholder-card soft">
                  <strong>Wspomnienia dodamy po Firebase</strong>
                  <p>Zdjęcia najlepiej zapisywać w chmurze, żeby nie zapchać pamięci telefonu i żeby działały u Ciebie oraz u Mileny.</p>
                </div>
              </SectionShell>
            )}

            {activeSection === "plan" && (
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
            )}
          </>
        )}
      </main>
    </div>
  );
}

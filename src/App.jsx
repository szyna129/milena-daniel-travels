
import React, {useState} from "react";
import "./index.css";

export default function App(){
  return (
    <div className="app">
      <div className="hero">
        <div className="overlay">
          <span className="pill">5 dni podróży</span>
          <h1>Rzym 2026</h1>
          <p>Pierwszy szkic wspólnego city breaku.</p>
        </div>
      </div>
      <div className="content">
        <h2>Plan dnia</h2>
        <p>Tu będzie Wasz plan podróży 👌</p>
      </div>
    </div>
  );
}

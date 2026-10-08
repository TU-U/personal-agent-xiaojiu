import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DesktopPet from './DesktopSurface';
import {desktop} from './desktop';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{desktop?.role==='pet'?<DesktopPet/>:<App/>}</React.StrictMode>);

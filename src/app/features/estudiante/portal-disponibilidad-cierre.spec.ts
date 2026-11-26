import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PortalEstudiante } from './portal-estudiante';
import { PortalEstudianteApi } from './portal-estudiante.api';
import { SESION_VISUAL_UNREAL } from '../simulador/unreal/configuracion-unreal';
describe('Cierre: simulador pendiente no bloquea el portal',()=>{
 function crear(visual: unknown=null){
  TestBed.configureTestingModule({imports:[PortalEstudiante],providers:[provideRouter([]),{provide:PortalEstudianteApi,useValue:{convocatorias:()=>of([])}},{provide:SESION_VISUAL_UNREAL,useValue:visual}]});
  const f=TestBed.createComponent(PortalEstudiante);return f.componentInstance as unknown as {comprobarSimulador():void;abrirSimulador():void;simulador():string};
 }
 it('no consulta un player provisional cuando no existe asignación',()=>{
  const socket=spyOn(globalThis,'WebSocket');const c=crear();c.comprobarSimulador();expect(c.simulador()).toBe('configuracion-pendiente');expect(socket).not.toHaveBeenCalled();
 });
 it('no conecta sin un intento y caso académico correspondientes',()=>{
  const socket=spyOn(globalThis,'WebSocket');const c=crear({urlSenalizacion:'ws://127.0.0.1:8898',streamerId:'referencia',sesion:'sesion-de-prueba',casoId:'caso-ajeno'});c.comprobarSimulador();expect(c.simulador()).toBe('contexto-pendiente');expect(socket).not.toHaveBeenCalled();
 });
 it('no redirige al laboratorio como sustituto del simulador académico',()=>{
  const c=crear();const nav=spyOn(TestBed.inject(Router),'navigate');c.abrirSimulador();expect(nav).not.toHaveBeenCalled();
 });
});

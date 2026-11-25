import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { FalloAcademico } from './academico-http';
import { CasosM3Api } from './casos-m3.api';

const B = '/api-prueba';
const U = '11111111-1111-4111-8111-111111111111';

describe('FE-61-R5 CasosM3Api.listado (GET /v1/casos, M3 DC-67)', () => {
  let http: HttpTestingController;
  let api: CasosM3Api;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(CasosM3Api);
  });

  afterEach(() => http.verify());

  it('mapea la respuesta {items} a CasoDocente[]', () => {
    let lista: unknown;
    api.listado().subscribe((r) => (lista = r));
    http
      .expectOne({ method: 'GET', url: `${B}/v1/casos` })
      .flush({ items: [{ idCaso: U, titulo: 'Caso A', tiempoEstimadoSegundos: 60, estado: 'Borrador' }] });
    expect(lista).toEqual([{ idCaso: U, titulo: 'Caso A', tiempoEstimadoSegundos: 60, estado: 'Borrador' }]);
  });

  it('rechaza respuesta sin items', () => {
    let error: FalloAcademico | undefined;
    api.listado().subscribe({ error: (e) => (error = e) });
    http.expectOne({ method: 'GET', url: `${B}/v1/casos` }).flush({ sinItems: true });
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('propaga el error real del Backend (es.g. 405 sin contrato)', () => {
    let error: FalloAcademico | undefined;
    api.listado().subscribe({ error: (e) => (error = e) });
    http
      .expectOne({ method: 'GET', url: `${B}/v1/casos` })
      .flush('405 sin usuarios', { status: 405, statusText: 'Method Not Allowed' });
    expect(error?.estado).toBe(405);
  });
});

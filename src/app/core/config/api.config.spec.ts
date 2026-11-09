import { TestBed } from '@angular/core/testing';

import { API_CONFIG, construirUrlApi, crearApiConfig, provideApiConfig } from './api.config';

describe('Configuración de API', () => {
  describe('crearApiConfig', () => {
    it('elimina las barras finales', () => {
      expect(crearApiConfig('/api///').baseUrl).toBe('/api');
      expect(crearApiConfig(' http://servidor:8080/api/ ').baseUrl).toBe('http://servidor:8080/api');
    });

    it('rechaza una URL vacía', () => {
      expect(() => crearApiConfig('')).toThrowError(/vacía/);
      expect(() => crearApiConfig('   ')).toThrowError(/vacía/);
      expect(() => crearApiConfig('/')).toThrowError(/vacía/);
    });
  });

  describe('construirUrlApi', () => {
    const config = crearApiConfig('/api');

    it('une base y ruta con una sola barra', () => {
      expect(construirUrlApi(config, 'recurso')).toBe('/api/recurso');
      expect(construirUrlApi(config, '/recurso/1')).toBe('/api/recurso/1');
    });

    it('rechaza rutas absolutas hacia otros servidores', () => {
      expect(() => construirUrlApi(config, 'http://otro/recurso')).toThrowError(/relativa/);
      expect(() => construirUrlApi(config, '//otro/recurso')).toThrowError(/relativa/);
    });

    it('rechaza repetir el segmento base', () => {
      expect(() => construirUrlApi(config, '/api/recurso')).toThrowError(/repite/);
    });

    it('rechaza rutas vacías', () => {
      expect(() => construirUrlApi(config, ' ')).toThrowError(/vacía/);
    });

    for (const ruta of ['../health', 'v1/../personal/yo', '%2e%2e/health', 'v1\\..\\health']) {
      it(`rechaza navegación fuera de la ruta de recurso: ${ruta}`, () => {
        expect(() => construirUrlApi(config, ruta)).toThrowError(/ruta|relativa/i);
      });
    }

    for (const ruta of ['api', 'api?pagina=1']) {
      it(`rechaza repetir la base sin un segmento posterior: ${ruta}`, () => {
        expect(() => construirUrlApi(config, ruta)).toThrowError(/repite/);
      });
    }

    it('conserva consultas relativas válidas sin interpretar sus valores como rutas', () => {
      expect(construirUrlApi(config, 'v1/casos?texto=../')).toBe('/api/v1/casos?texto=../');
    });
  });

  describe('API_CONFIG', () => {
    it('provee una URL base desde el entorno activo', () => {
      const config = TestBed.inject(API_CONFIG);

      expect(config.baseUrl).toBeTruthy();
      expect(config.baseUrl.endsWith('/')).toBeFalse();
    });

    it('puede sustituirse con provideApiConfig', () => {
      TestBed.configureTestingModule({ providers: [provideApiConfig('https://despliegue.ejemplo/api/')] });

      expect(TestBed.inject(API_CONFIG).baseUrl).toBe('https://despliegue.ejemplo/api');
    });
  });
});

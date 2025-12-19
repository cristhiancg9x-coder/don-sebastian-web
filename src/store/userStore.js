import { atom } from 'nanostores';

// Aquí guardaremos al usuario (null = nadie, object = usuario logueado)
export const $user = atom(null);
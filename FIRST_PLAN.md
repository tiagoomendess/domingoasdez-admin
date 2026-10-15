# New Backend Admin for Domingo às Dez website

A simple web admin for the domingo às dez website to replace old Laravel site at @E:\Projetos\DomingoAsDez

# New Frontend

The public facing part is already almost finished, and lives at @C:\Users\Tiago\Desktop\repos\domingoasdez-app

# Plan for the new Admin area

- Replicate the old feel in the new admin area
  - Same top nav and left sidenav menu layout
  - Primarly to be used on desktop, but some compatibility with mobile is appreciated
  - You are allowed to change some aspects slightly if it means a better UX for the admin user
- Add light and Dark modes
- Logins must work with the old email and password as the laravel site
  - new frontend web app is already build that way and compatible too
- Use flowbite svelte as ui component library to speed up development
- Replace Google Maps location picker with openstreetmaps
- All dropdowns should be searchable, with lazy loading and debounce on search typing
- Prioritize simple UI and good Admin UX
- Files to be stored in cloudfalre R2
- Leave automated processes like cronjobs and commands at the old one, only manage entities in the new one

// Navbar configuration for blr-home project
// This file allows easy customization of navbar elements

export const navbarConfig = {
  // Brand/logo configuration
  brand: {
    image: './assets/bracket.svg',
    link: '/',
    alt: 'Bracket logo'
  },
  
  sections: [
    {
      type: 'link',
      label: 'Scoreboard',
      url: '/scoreboard.html'
    },
    {
      type: 'link',
      label: 'Bracket',
      url: '/bracket.html'
    },
    {
      type: 'link',
      label: 'Rules',
      url: '/rules.html'
    },
    {
      type: 'dropdown',
      label: 'More!',
      items: [
        { name: 'About <em>bracket-revival</em>', url: '/about.html' },
        { name: 'Join a Game', url: '/join.html' },
        { name: 'Make Picks', url: '/picks.html' },
        { name: 'See the Code', url: 'https://github.com/pdav5883/bracket-revival' },
        { name: 'Bear Loves Rocks', url: 'https://home.bearloves.rocks' }
      ]
    }
  ]
};
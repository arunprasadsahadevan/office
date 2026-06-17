import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';

export default function AppLogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LocalLaundryServiceIcon sx={{ color: 'white', fontSize: 22 }} />
      </Box>
      <Typography variant="h6" component="span" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
        LaundryOS
      </Typography>
    </Box>
  );
}

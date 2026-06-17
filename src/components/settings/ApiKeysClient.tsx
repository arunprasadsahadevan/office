'use client';

import { useState, useTransition } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BlockIcon from '@mui/icons-material/Block';
import { createApiKey, revokeApiKey } from '@/actions/apiKeys';
import type { ApiKey } from '@/types';

interface Props {
  keys: ApiKey[];
}

export default function ApiKeysClient({ keys: initialKeys }: Props) {
  const [keys, setKeys] = useState(initialKeys);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreateError(null);
    startTransition(async () => {
      const res = await createApiKey(newKeyName.trim());
      if (res.error) {
        setCreateError(res.error);
      } else if (res.key && res.rawKey) {
        setKeys((prev) => [res.key!, ...prev]);
        setRevealedKey(res.rawKey);
        setNewKeyName('');
      }
    });
  }

  function handleRevoke(keyId: string) {
    startTransition(async () => {
      const res = await revokeApiKey(keyId);
      if (!res.error) {
        setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, is_active: false } : k));
      }
    });
  }

  function handleCopy() {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCloseReveal() {
    setRevealedKey(null);
    setCreateOpen(false);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setCreateOpen(true)}
        >
          Create Key
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Name</TableCell>
              <TableCell>Prefix</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell>Created</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No API keys yet
                </TableCell>
              </TableRow>
            )}
            {keys.map((key) => (
              <TableRow key={key.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{key.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {key.key_prefix}…
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={key.is_active ? 'Active' : 'Revoked'}
                    color={key.is_active ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString('en-KW', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })
                      : 'Never'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(key.created_at).toLocaleDateString('en-KW', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </Typography>
                </TableCell>
                <TableCell>
                  {key.is_active && (
                    <Tooltip title="Revoke key">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRevoke(key.id)}
                        disabled={isPending}
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create dialog */}
      <Dialog open={createOpen && !revealedKey} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Key Name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Integration"
              fullWidth
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            {createError && <Alert severity="error" sx={{ mt: 1 }}>{createError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={isPending || !newKeyName.trim()}>
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reveal dialog — shown once after creation */}
      <Dialog open={!!revealedKey} onClose={handleCloseReveal} maxWidth="sm" fullWidth>
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Copy this key now — it will <strong>not</strong> be shown again.
          </Alert>
          <Box
            sx={{
              display: 'flex', gap: 1, alignItems: 'center',
              bgcolor: 'grey.100', borderRadius: 1, p: 1.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}
            >
              {revealedKey}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCloseReveal}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

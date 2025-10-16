# MCP Security Guide

Guida completa alla sicurezza dei server MCP containerizzati.

## Principi di Sicurezza

### 1. Defense in Depth

I server MCP implementano molteplici livelli di sicurezza:

1. **Container Isolation**: Ogni server è isolato in un container
2. **Network Segmentation**: Reti separate per servizi MCP e applicazione
3. **Resource Limits**: Limiti rigidi su CPU, memoria e processi
4. **Read-only Filesystem**: Filesystem immutabile eccetto /tmp
5. **Dropped Capabilities**: Rimozione di tutte le Linux capabilities
6. **Non-root User**: Esecuzione come utente non privilegiato (UID 1000)

### 2. Security Hardening

#### Filesystem Security

```yaml
read_only: true # Filesystem read-only
tmpfs:
  - /tmp:rw,size=64m,mode=1777 # Solo /tmp scrivibile, limitato
```

**Benefici**:

- Previene modifiche al codice runtime
- Impedisce download di malware
- Limita superficie d'attacco

#### Capabilities

```yaml
cap_drop:
  - ALL # Rimuove tutte le capabilities
security_opt:
  - no-new-privileges:true # Impedisce escalation
```

**Capabilities rimosse**:

- `CAP_NET_RAW`: Previene packet sniffing
- `CAP_SYS_ADMIN`: Previene operazioni amministrative
- `CAP_SETUID/SETGID`: Previene cambio UID/GID

#### Resource Limits

```yaml
pids_limit: 128 # Max 128 processi
mem_limit: 512m # Max 512MB RAM
memswap_limit: 512m # Disabilita swap
cpus: '0.5' # Max 50% CPU
```

**Protezioni**:

- Fork bombs prevention (pids_limit)
- Memory exhaustion prevention
- CPU starvation prevention

#### User Security

```yaml
user: '1000:1000' # Non-root user
```

**Benefici**:

- Limita danni in caso di compromissione
- Previene accesso a file sensibili dell'host
- Limita operazioni privilegiate

## Threat Model

### Minacce Mitigate

1. **Container Breakout** ✅
   - Mitigazione: read-only FS, dropped capabilities, no-new-privileges
   - Residual Risk: LOW

2. **Resource Exhaustion** ✅
   - Mitigazione: strict resource limits (CPU, memory, PIDs)
   - Residual Risk: LOW

3. **Network Attacks** ✅
   - Mitigazione: network isolation, no exposed ports
   - Residual Risk: MEDIUM (dipende da network policy)

4. **Data Exfiltration** ⚠️
   - Mitigazione: network segmentation, audit logging
   - Residual Risk: MEDIUM (server ha accesso a API esterne)

5. **Malware Injection** ✅
   - Mitigazione: read-only FS, dropped capabilities
   - Residual Risk: LOW

6. **Privilege Escalation** ✅
   - Mitigazione: non-root user, no-new-privileges, dropped capabilities
   - Residual Risk: VERY LOW

### Minacce Non Mitigate

1. **API Key Compromise** ❌
   - Risk: HIGH
   - Raccomandazione: Usa secrets manager, ruota chiavi regolarmente

2. **Side-channel Attacks** ❌
   - Risk: LOW
   - Raccomandazione: Monitora metriche inusuali

3. **Supply Chain Attacks** ⚠️
   - Risk: MEDIUM
   - Raccomandazione: Verifica hash immagini, scan vulnerabilità

## Best Practices

### 1. Secrets Management

#### ❌ MAI Fare Questo

```yaml
environment:
  - GITHUB_TOKEN=ghp_hardcoded_token_here # WRONG!
```

```dockerfile
ENV API_KEY=sk-secret-key  # WRONG!
```

#### ✅ Approccio Corretto

```yaml
# docker-compose.yml
environment:
  - GITHUB_TOKEN=${GITHUB_TOKEN}  # From .env

# .env (gitignored!)
GITHUB_TOKEN=ghp_actual_token_here
```

**Produzione**:

```bash
# Use Docker secrets
docker secret create github_token /path/to/token
docker service create --secret github_token ...
```

### 2. Network Security

#### Segmentazione

```yaml
networks:
  mcp-network:
    driver: bridge
    internal: true # No internet access

  external-network:
    driver: bridge # With internet
```

#### Firewall Rules

```bash
# Permetti solo traffico necessario
iptables -A INPUT -i docker0 -j DROP
iptables -A INPUT -i docker0 -s 172.17.0.0/16 -d 172.17.0.0/16 -j ACCEPT
```

### 3. Image Security

#### Scanning

```bash
# Scan con Trivy
trivy image meepleai/mcp-github:latest

# Scan con Snyk
snyk container test meepleai/mcp-github:latest

# Docker Scout
docker scout cves meepleai/mcp-github:latest
```

#### Image Verification

```bash
# Sign images
docker trust sign meepleai/mcp-github:latest

# Verify signature
docker trust inspect --pretty meepleai/mcp-github:latest
```

#### Multi-stage Builds

```dockerfile
# Build stage (non incluso in produzione)
FROM node:20-alpine AS builder
RUN npm install

# Production stage (minimal)
FROM node:20-alpine
COPY --from=builder /app/node_modules ./node_modules
```

### 4. Runtime Security

#### AppArmor Profile

```bash
# /etc/apparmor.d/docker-mcp
profile docker-mcp flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  deny /proc/* w,
  deny /sys/* w,
  deny /dev/* w,

  /tmp/** rw,
  /app/** r,
  /app/node_modules/** r,
}
```

Applica:

```yaml
security_opt:
  - apparmor=docker-mcp
```

#### Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "open", "close", "stat"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Applica:

```yaml
security_opt:
  - seccomp=/path/to/profile.json
```

### 5. Monitoring e Audit

#### Logging

```yaml
logging:
  driver: 'json-file'
  options:
    max-size: '10m'
    max-file: '3'
    labels: 'mcp.service,mcp.type'
```

#### Audit Events

```bash
# Configura auditd per Docker
auditctl -w /var/lib/docker -p wa
auditctl -w /usr/bin/docker -p x

# Log tutti i comandi docker
ausearch -k docker
```

#### Intrusion Detection

```bash
# Falco per runtime security
docker run -d \
  --name falco \
  --privileged \
  -v /var/run/docker.sock:/host/var/run/docker.sock \
  -v /dev:/host/dev \
  -v /proc:/host/proc:ro \
  falcosecurity/falco
```

## Security Checklist

### Pre-deployment

- [ ] Scansiona immagini per vulnerabilità
- [ ] Verifica non ci siano secrets hardcoded
- [ ] Testa con minimal privileges
- [ ] Verifica resource limits appropriati
- [ ] Configura network policies
- [ ] Implementa secrets management
- [ ] Configura logging e monitoring

### Runtime

- [ ] Monitora uso risorse
- [ ] Controlla log per anomalie
- [ ] Verifica non ci siano escalation di privilegi
- [ ] Audit network traffic
- [ ] Controlla security advisories

### Manutenzione

- [ ] Aggiorna immagini base regolarmente
- [ ] Ruota secrets (API keys, tokens)
- [ ] Review access logs
- [ ] Patch vulnerabilità note
- [ ] Backup dati importanti

## Incident Response

### Container Compromesso

1. **Isola immediatamente**

   ```bash
   docker network disconnect mcp-network mcp-compromised
   ```

2. **Cattura stato**

   ```bash
   docker inspect mcp-compromised > compromise-state.json
   docker logs mcp-compromised > compromise-logs.txt
   docker cp mcp-compromised:/tmp compromise-tmp/
   ```

3. **Termina container**

   ```bash
   docker stop mcp-compromised
   docker rm mcp-compromised
   ```

4. **Analizza**
   - Review logs per pattern di attacco
   - Identifica vulnerabilità sfruttata
   - Verifica altri container

5. **Remediation**
   - Patch vulnerabilità
   - Aggiorna configurazioni security
   - Rebuild immagine
   - Rideploy

### API Key Leak

1. **Revoca immediatamente**
   - GitHub: Settings > Developer settings > Personal access tokens
   - OpenRouter: Dashboard > API Keys

2. **Genera nuova chiave**

3. **Aggiorna configurazione**

   ```bash
   # Update .env
   nano .env

   # Restart services
   docker-compose up -d
   ```

4. **Audit uso chiave compromessa**

## Security Contacts

- **Security Issues**: Invia email privata a security@example.com
- **CVE Database**: https://cve.mitre.org
- **Docker Security**: https://docs.docker.com/engine/security/

## Conformità

### GDPR

- Minimizza raccolta dati
- Implementa right to erasure (`memory_forget`)
- Log audit per access tracking
- Data encryption at rest

### SOC 2

- Access control (user: 1000:1000)
- Audit logging
- Resource limits
- Incident response procedures

## Resources

- [Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- [Linux Capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html)

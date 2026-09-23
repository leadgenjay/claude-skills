#!/usr/bin/env bash
# Read-only Hermes health snapshot. Never prompts. Never prints a secret value.
# Streamed as: ssh -o BatchMode=yes <alias> 'bash -ls' < hermes-snapshot.sh
#          or: ssh -o BatchMode=yes <alias> 'bash -ls -- --container NAME' < hermes-snapshot.sh
# stdin is the script. Never read fd 0. Redirect every external command from /dev/null.

set +e
export LC_ALL=C

OS=$(uname -s 2>/dev/null || true)
WANT_CONTAINER=""
SHAPE=""
HB=""
CONTAINER=""
DOCKER_PERM=""
DATA_BIND_SOURCE=""
IMAGE_DIGEST=""
TMP=/tmp/hermes-snapshot.$$
trap "rm -f '$TMP.out' '$TMP.err'" EXIT

# --- helpers ---------------------------------------------------------------

mask() {
  sed -E \
    -e 's/sk-[A-Za-z0-9_-]{8,}/[masked]/g' \
    -e 's/xox[abprs]-[A-Za-z0-9-]{8,}/[masked]/g' \
    -e 's/(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/[masked]/g' \
    -e 's/AKIA[0-9A-Z]{16}/[masked]/g' \
    -e 's#Bearer [A-Za-z0-9._~+/=-]{8,}#[masked]#g' \
    -e 's/[0-9]{4}[ -][0-9]{4}[ -][0-9]{4}[ -][0-9]{1,7}/[masked]/g' \
    -e 's/[0-9]{13,19}/[masked]/g' \
    -e 's/[0-9A-Fa-f]{32,}/[masked]/g'
}

indent() {
  sed 's/^/  /'
}

# Print a multi-line excerpt under KEY, masked and indented. Empty -> unavailable.
emit_excerpt() {
  local _key _body _reason
  _key=$1
  _body=$2
  _reason=$3
  if [ -z "$_body" ]; then
    printf '%s: unavailable (%s)\n' "$_key" "${_reason:-empty output}"
    return
  fi
  printf '%s:\n' "$_key"
  printf '%s\n' "$_body" | mask | indent
}

emit_first_n() {
  local _key _body _n _reason _cut
  _key=$1
  _body=$2
  _n=$3
  _reason=$4
  if [ -z "$_body" ]; then
    printf '%s: unavailable (%s)\n' "$_key" "${_reason:-empty output}"
    return
  fi
  _cut=$(printf '%s\n' "$_body" | head -n "$_n")
  emit_excerpt "$_key" "$_cut" "$_reason"
}

emit_last_n() {
  local _key _body _n _reason _cut
  _key=$1
  _body=$2
  _n=$3
  _reason=$4
  if [ -z "$_body" ]; then
    printf '%s: unavailable (%s)\n' "$_key" "${_reason:-empty output}"
    return
  fi
  _cut=$(printf '%s\n' "$_body" | tail -n "$_n")
  emit_excerpt "$_key" "$_cut" "$_reason"
}

emit_names() {
  local _key _body
  _key=$1
  _body=$2
  if [ -z "$_body" ]; then
    printf '%s:\n' "$_key"
    return
  fi
  printf '%s:\n' "$_key"
  printf '%s\n' "$_body" | indent
}

# $HB is either an absolute path or the words: docker exec <c> hermes
run_hb() {
  OUT=$($HB "$@" </dev/null 2>&1)
  EC=$?
}

resolve_hermes() {
  local _c _ifs _d _cand
  _c=$(command -v hermes 2>/dev/null || true)
  if [ -n "$_c" ] && [ -f "$_c" ] && [ -x "$_c" ]; then
    case "$_c" in
      /*)
        printf '%s\n' "$_c"
        return 0
        ;;
    esac
  fi
  if [ -n "$_c" ]; then
    _ifs=$IFS
    IFS=:
    for _d in $PATH; do
      [ -n "$_d" ] || continue
      _cand="${_d%/}/hermes"
      if [ -f "$_cand" ] && [ -x "$_cand" ]; then
        IFS=$_ifs
        printf '%s\n' "$_cand"
        return 0
      fi
    done
    IFS=$_ifs
  fi
  if [ -f "$HOME/.hermes/hermes-agent/venv/bin/hermes" ] && [ -x "$HOME/.hermes/hermes-agent/venv/bin/hermes" ]; then
    printf '%s\n' "$HOME/.hermes/hermes-agent/venv/bin/hermes"
    return 0
  fi
  if [ -f "$HOME/.local/bin/hermes" ] && [ -x "$HOME/.local/bin/hermes" ]; then
    printf '%s\n' "$HOME/.local/bin/hermes"
    return 0
  fi
  # Root installs use /usr/local/bin. The official image keeps hermes in
  # /opt/hermes/bin, which a login shell drops from PATH.
  for _cand in /usr/local/bin/hermes /opt/hermes/bin/hermes; do
    if [ -f "$_cand" ] && [ -x "$_cand" ]; then
      printf '%s\n' "$_cand"
      return 0
    fi
  done
  return 1
}

ver_older_than() {
  local _u _t _old _u1 _u2 _u3 _t1 _t2 _t3
  _u=$1
  _t=$2
  _old=$IFS
  IFS=.
  set -- $_u
  _u1=${1:-0}
  _u2=${2:-0}
  _u3=${3:-0}
  set -- $_t
  _t1=${1:-0}
  _t2=${2:-0}
  _t3=${3:-0}
  IFS=$_old
  _u1=$(printf '%s' "$_u1" | sed 's/[^0-9]//g')
  _u2=$(printf '%s' "$_u2" | sed 's/[^0-9]//g')
  _u3=$(printf '%s' "$_u3" | sed 's/[^0-9]//g')
  _t1=$(printf '%s' "$_t1" | sed 's/[^0-9]//g')
  _t2=$(printf '%s' "$_t2" | sed 's/[^0-9]//g')
  _t3=$(printf '%s' "$_t3" | sed 's/[^0-9]//g')
  [ -n "$_u1" ] || _u1=0
  [ -n "$_u2" ] || _u2=0
  [ -n "$_u3" ] || _u3=0
  [ -n "$_t1" ] || _t1=0
  [ -n "$_t2" ] || _t2=0
  [ -n "$_t3" ] || _t3=0
  _u1=$((10#${_u1}))
  _u2=$((10#${_u2}))
  _u3=$((10#${_u3}))
  _t1=$((10#${_t1}))
  _t2=$((10#${_t2}))
  _t3=$((10#${_t3}))
  if [ "$_u1" -lt "$_t1" ]; then return 0; fi
  if [ "$_u1" -gt "$_t1" ]; then return 1; fi
  if [ "$_u2" -lt "$_t2" ]; then return 0; fi
  if [ "$_u2" -gt "$_t2" ]; then return 1; fi
  if [ "$_u3" -lt "$_t3" ]; then return 0; fi
  return 1
}

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

env_keys_from_file() {
  sed -nE 's/^(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p'
}

print_env_keys() {
  local _keys
  _keys=$1
  if [ -z "$_keys" ]; then
    printf 'env_keys:\n'
    return
  fi
  emit_names env_keys "$_keys"
}

# --- args ------------------------------------------------------------------

while [ $# -gt 0 ]; do
  case "$1" in
    --)
      shift
      ;;
    --container)
      if [ $# -lt 2 ]; then
        printf 'error: unknown argument --container\n'
        exit 64
      fi
      WANT_CONTAINER=$2
      shift 2
      ;;
    *)
      printf 'error: unknown argument %s\n' "$1"
      exit 64
      ;;
  esac
done

# --- shape detection -------------------------------------------------------

if [ "$OS" = Darwin ]; then
  _bin=$(resolve_hermes)
  if [ -n "$_bin" ]; then
    SHAPE=macos
    HB=$_bin
  fi
fi
# Docker is checked on any host without a native macOS install, including a Mac
# that runs Hermes only inside a container.
if [ -z "$SHAPE" ]; then
  if command -v docker >/dev/null 2>&1; then
    docker ps --format '{{.Names}}|{{.Image}}' </dev/null >"$TMP.out" 2>"$TMP.err"
    _dps_ec=$?
    _dps_err=$(cat "$TMP.err" 2>/dev/null)
    if [ "$_dps_ec" -ne 0 ] && printf '%s' "$_dps_err" | grep -qi 'permission denied'; then
      DOCKER_PERM='docker: permission denied (add your user to the docker group or use sudo)'
    elif [ "$_dps_ec" -ne 0 ]; then
      # A stopped daemon must not read as "no containers here".
      DOCKER_PERM="docker: unavailable ($(printf '%s' "$_dps_err" | head -n 1 | cut -c1-120))"
    else
      _all_names=$(awk -F'|' 'NF>=1 { n=$1; sub(/,.*/,"",n); if (n != "") print n }' "$TMP.out" 2>/dev/null)
      _hermes_rows=$(awk -F'|' 'NF>=2 && $2 ~ /hermes-agent/ { n=$1; sub(/,.*/,"",n); print n "|" $2 }' "$TMP.out" 2>/dev/null)
      _match_count=$(printf '%s\n' "$_hermes_rows" | awk 'NF { c++ } END { print c+0 }')
      if [ -n "$WANT_CONTAINER" ]; then
        if ! printf '%s\n' "$_all_names" | grep -Fxq -- "$WANT_CONTAINER"; then
          printf 'error: container %s not running\n' "$WANT_CONTAINER"
          exit 2
        fi
        SHAPE=docker
        CONTAINER=$WANT_CONTAINER
        HB="docker exec $CONTAINER hermes"
      elif [ "$_match_count" -gt 1 ]; then
        printf 'shape: docker\n'
        printf 'containers:\n'
        printf '%s\n' "$_hermes_rows" | awk -F'|' 'NF>=2 { print "  " $1 "  " $2 }'
        printf 'action: re-run with --container NAME\n'
        exit 3
      elif [ "$_match_count" -eq 1 ]; then
        _one=$(printf '%s\n' "$_hermes_rows" | head -n 1)
        CONTAINER=${_one%%|*}
        SHAPE=docker
        HB="docker exec $CONTAINER hermes"
      fi
    fi
  fi
  if [ -z "$SHAPE" ] && [ "$OS" != Darwin ]; then
    _bin=$(resolve_hermes)
    if [ -n "$_bin" ]; then
      SHAPE=linux
      HB=$_bin
    fi
  fi
fi

if [ -z "$SHAPE" ]; then
  printf 'shape: unknown\n'
  if [ -n "$DOCKER_PERM" ]; then
    printf '%s\n' "$DOCKER_PERM"
  fi
  printf 'reason: no hermes binary on PATH or in ~/.hermes, and no running hermes-agent container\n'
  exit 2
fi

printf 'shape: %s\n' "$SHAPE"
if [ -n "$DOCKER_PERM" ]; then
  printf '%s\n' "$DOCKER_PERM"
fi
if [ "$SHAPE" = docker ]; then
  printf 'container: %s\n' "$CONTAINER"
fi

# --- hermes_bin / version / doctor -----------------------------------------

printf 'hermes_bin: %s\n' "$HB"

run_hb --version
if [ "$EC" -ne 0 ] || [ -z "$OUT" ]; then
  # A failed call's error text must never be printed as if it were the version.
  printf 'version: unavailable (exit %s: %s)\n' "$EC" "$(printf '%s\n' "$OUT" | head -n 1 | mask | cut -c1-160)"
else
  _ver_line=$(printf '%s\n' "$OUT" | head -n 1)
  printf 'version: %s\n' "$_ver_line"
  _ver=$(printf '%s' "$_ver_line" | sed -nE 's/.*[vV]?([0-9]+\.[0-9]+\.[0-9]+).*/\1/p')
  if [ -n "$_ver" ] && ver_older_than "$_ver" "0.20.4"; then
    printf 'version_warning: older than 0.20.4, the version this skill was tested on; some commands may differ\n'
  fi
fi

run_hb doctor
printf 'doctor_exit: %s\n' "$EC"
if [ -z "$OUT" ]; then
  if [ "$EC" -ne 0 ]; then
    printf 'doctor: unavailable (exit %s)\n' "$EC"
  else
    printf 'doctor: unavailable (empty output)\n'
  fi
else
  emit_last_n doctor "$OUT" 15 "empty output"
fi

# --- gateway ---------------------------------------------------------------

run_hb gateway status
if [ -z "$OUT" ]; then
  if [ "$EC" -ne 0 ]; then
    printf 'gateway: unavailable (exit %s)\n' "$EC"
  else
    printf 'gateway: unavailable (empty output)\n'
  fi
else
  emit_first_n gateway "$OUT" 15 "empty output"
fi
_gw_ec=$EC

if [ "$_gw_ec" -ne 0 ]; then
  _fb=""
  if [ "$SHAPE" = docker ]; then
    # The official image runs the gateway under s6, not a service manager, so the
    # container's own state and log tail are the fallback.
    _fb=$(docker ps --filter "name=^${CONTAINER}\$" --format 'container status: {{.Status}}' </dev/null 2>/dev/null
          docker logs --tail 15 "$CONTAINER" </dev/null 2>&1)
  elif [ "$OS" = Darwin ]; then
    _fb=$(launchctl list </dev/null 2>/dev/null | grep -i hermes)
  else
    _fb=$(systemctl --user status 'hermes-gateway*' --no-pager </dev/null 2>/dev/null | head -n 15)
    if [ -z "$_fb" ]; then
      _fb=$(systemctl status 'hermes-gateway*' --no-pager </dev/null 2>/dev/null | head -n 15)
    fi
  fi
  if [ -n "$_fb" ]; then
    emit_excerpt gateway_fallback "$_fb" "empty output"
  fi
fi

if [ "$OS" = Linux ]; then
  _linger=$(loginctl show-user "$USER" -p Linger </dev/null 2>/dev/null)
  if [ -n "$_linger" ]; then
    printf 'linger: %s\n' "$_linger"
  else
    printf 'linger: unavailable\n'
  fi
fi

# --- errors / cron ---------------------------------------------------------

run_hb logs errors --since 24h -n 20
if [ "$EC" -ne 0 ]; then
  printf 'errors_24h: unavailable (exit %s: %s)\n' "$EC" "$(printf '%s\n' "$OUT" | head -n 1 | mask | cut -c1-160)"
elif [ -z "$OUT" ]; then
  printf 'errors_24h: none (empty output)\n'
else
  emit_excerpt errors_24h "$OUT" "empty output"
fi

run_hb cron status
if [ "$EC" -ne 0 ] || [ -z "$OUT" ]; then
  printf 'cron_status: unavailable (exit %s: %s)\n' "$EC" "$(printf '%s\n' "$OUT" | head -n 1 | mask | cut -c1-160)"
else
  emit_first_n cron_status "$OUT" 5 "empty output"
fi

run_hb cron list
if [ "$EC" -ne 0 ]; then
  # A failed list must never parse as "0 jobs, no problems".
  printf 'cron_problems: unavailable (exit %s: %s)\n' "$EC" "$(printf '%s\n' "$OUT" | head -n 1 | mask | cut -c1-160)"
else
  # A job's status is the last field of its "Last run:" line. Matching on words
  # would flag any job or skill whose name contains "error" or "fail".
  _njobs=$(printf '%s\n' "$OUT" | grep -cE '^[[:space:]]*Name:')
  _nrun=$(printf '%s\n' "$OUT" | grep -cE '^[[:space:]]*Last run:')
  _probs=$(printf '%s\n' "$OUT" | awk '
    /^[[:space:]]*Name:/ { name=$0; sub(/^[[:space:]]*Name:[[:space:]]*/, "", name) }
    /^[[:space:]]*Last run:/ { if ($NF != "ok" && $NF != "never") { l=$0; sub(/^[[:space:]]*/, "", l); print name ": " l } }
  ' | head -n 20)
  printf 'cron_jobs: %s\n' "$_njobs"
  if [ "$_njobs" -gt 0 ] && [ "$_nrun" -eq 0 ]; then
    printf 'cron_problems: unknown (no "Last run:" lines, so this format was not recognised)\n'
  elif [ -z "$_probs" ]; then
    printf 'cron_problems: none\n'
  else
    emit_excerpt cron_problems "$_probs" "none"
  fi
fi

# --- env_keys (names only; raw file never reaches stdout) ------------------

if [ "$SHAPE" = docker ]; then
  if ! docker exec "$CONTAINER" true </dev/null 2>/dev/null; then
    printf 'env_keys: unavailable (docker exec failed)\n'
  elif docker exec "$CONTAINER" test -f /opt/data/.env </dev/null 2>/dev/null; then
    if docker exec "$CONTAINER" test -r /opt/data/.env </dev/null 2>/dev/null; then
      _keys=$(docker exec "$CONTAINER" cat /opt/data/.env </dev/null 2>/dev/null | env_keys_from_file | sort -u)
      print_env_keys "$_keys"
    else
      printf 'env_keys: unreadable\n'
    fi
  else
    printf 'env_keys: missing\n'
  fi
else
  _envf="$HOME/.hermes/.env"
  if [ ! -f "$_envf" ]; then
    printf 'env_keys: missing\n'
  elif [ ! -r "$_envf" ]; then
    printf 'env_keys: unreadable\n'
  else
    _keys=$(env_keys_from_file < "$_envf" | sort -u)
    print_env_keys "$_keys"
  fi
fi

# --- docker inspect (docker shape only) ------------------------------------

if [ "$SHAPE" = docker ]; then
  if ! docker inspect "$CONTAINER" </dev/null >/dev/null 2>&1; then
    printf 'image: unavailable (docker inspect failed)\n'
    printf 'image_digest: unavailable (docker inspect failed)\n'
    printf 'restart_policy: unavailable (docker inspect failed)\n'
    printf 'mounts: unavailable (docker inspect failed)\n'
    printf 'container_env_keys: unavailable (docker inspect failed)\n'
    printf 'data_mount: none\n'
    printf 'compose: unavailable (docker inspect failed)\n'
    printf 'upgrade_command: unavailable (docker inspect failed)\n'
  else
    _image=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" </dev/null 2>/dev/null)
    IMAGE_DIGEST=$(docker inspect --format '{{.Image}}' "$CONTAINER" </dev/null 2>/dev/null)
    _restart=$(docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$CONTAINER" </dev/null 2>/dev/null)
    printf 'image: %s\n' "${_image:-unavailable}"
    printf 'image_digest: %s\n' "${IMAGE_DIGEST:-unavailable}"
    if [ -n "$_restart" ]; then
      printf 'restart_policy: %s\n' "$_restart"
    else
      printf 'restart_policy: none\n'
    fi

    _mounts=$(docker inspect --format '{{range .Mounts}}{{.Type}}|{{.Name}}|{{.Source}}|{{.Destination}}{{println}}{{end}}' "$CONTAINER" </dev/null 2>/dev/null | tr -d '\r')
    _data_type=""
    _mount_lines=""
    if [ -z "$_mounts" ]; then
      printf 'mounts: none\n'
    else
      _oldifs=$IFS
      set -f
      IFS='
'
      for _ml in $_mounts; do
        IFS=$_oldifs
        [ -n "$_ml" ] || continue
        _mtype=${_ml%%|*}
        _rest=${_ml#*|}
        _mname=${_rest%%|*}
        _rest=${_rest#*|}
        _msrc=${_rest%%|*}
        _mdest=${_rest#*|}
        if [ "$_mtype" = volume ]; then
          _left=$_mname
        else
          _left=$_msrc
        fi
        _line=$(printf '%s %s -> %s' "$_mtype" "$_left" "$_mdest")
        if [ -z "$_mount_lines" ]; then
          _mount_lines=$_line
        else
          _mount_lines=$(printf '%s\n%s' "$_mount_lines" "$_line")
        fi
        if [ "$_mdest" = /opt/data ] || [ "$_mdest" = /opt/data/ ]; then
          _data_type=$_mtype
          if [ "$_mtype" = bind ]; then
            DATA_BIND_SOURCE=$_msrc
          fi
        fi
      done
      IFS=$_oldifs
      set +f
      emit_names mounts "$_mount_lines"
    fi

    case "$_data_type" in
      bind) printf 'data_mount: bind\n' ;;
      volume) printf 'data_mount: volume\n' ;;
      *) printf 'data_mount: none\n' ;;
    esac

    _ckeys=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" </dev/null 2>/dev/null | env_keys_from_file | sort -u)
    if [ -z "$_ckeys" ]; then
      printf 'container_env_keys:\n'
    else
      emit_names container_env_keys "$_ckeys"
    fi

    _cproj=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$CONTAINER" </dev/null 2>/dev/null)
    _cproj=$(trim "$_cproj")
    if [ "$_cproj" = "<no value>" ]; then _cproj=""; fi
    if [ -n "$_cproj" ]; then
      _cwork=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$CONTAINER" </dev/null 2>/dev/null)
      _cfiles=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$CONTAINER" </dev/null 2>/dev/null)
      _csvc=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$CONTAINER" </dev/null 2>/dev/null)
      _cwork=$(trim "$_cwork")
      _cfiles=$(trim "$_cfiles")
      _csvc=$(trim "$_csvc")
      if [ "$_cwork" = "<no value>" ]; then _cwork=""; fi
      if [ "$_cfiles" = "<no value>" ]; then _cfiles=""; fi
      if [ "$_csvc" = "<no value>" ]; then _csvc=""; fi
      printf 'compose: yes\n'
      printf 'compose_project: %s\n' "$_cproj"
      printf 'compose_service: %s\n' "$_csvc"
      printf 'compose_workdir: %s\n' "$_cwork"
      printf 'compose_files: %s\n' "$_cfiles"
      _fargs=""
      _rest=$_cfiles
      while [ -n "$_rest" ]; do
        case "$_rest" in
          *,*)
            _one=${_rest%%,*}
            _rest=${_rest#*,}
            ;;
          *)
            _one=$_rest
            _rest=""
            ;;
        esac
        _one=$(trim "$_one")
        [ -n "$_one" ] || continue
        _fargs="$_fargs -f '$_one'"
      done
      printf "upgrade_command: cd '%s' && docker compose -p '%s'%s pull '%s' && docker compose -p '%s'%s up -d '%s'\n" \
        "$_cwork" "$_cproj" "$_fargs" "$_csvc" "$_cproj" "$_fargs" "$_csvc"
      printf 'rollback_pin: %s\n' "${IMAGE_DIGEST:-unavailable}"
    else
      printf 'compose: no\n'
      printf 'upgrade_command: none (container was started by hand; recreate it yourself with the new image tag)\n'
    fi
  fi
fi

# --- update_check / disk / memory / uptime ---------------------------------

if [ "$SHAPE" = docker ]; then
  printf 'update_check: n/a in docker (upgrade by pulling a new image)\n'
else
  run_hb update --check
  if [ -z "$OUT" ]; then
    if [ "$EC" -ne 0 ]; then
      printf 'update_check: unavailable (exit %s)\n' "$EC"
    else
      printf 'update_check: unavailable (empty output)\n'
    fi
  else
    emit_first_n update_check "$OUT" 5 "empty output"
  fi
fi

_df_home=$(df -h "$HOME" </dev/null 2>/dev/null | tail -n 1)
if [ -n "$DATA_BIND_SOURCE" ]; then
  _df_data=$(df -h "$DATA_BIND_SOURCE" </dev/null 2>/dev/null | tail -n 1)
  if [ -n "$_df_home" ] || [ -n "$_df_data" ]; then
    _disk=$(printf '%s' "$_df_home")
    if [ -n "$_df_data" ]; then
      if [ -n "$_disk" ]; then
        _disk=$(printf '%s\n%s' "$_disk" "$_df_data")
      else
        _disk=$_df_data
      fi
    fi
    _disk=$(printf '%s\n' "$_disk" | awk 'NF && !seen[$0]++')
    _n=$(printf '%s\n' "$_disk" | awk 'NF { c++ } END { print c+0 }')
    if [ "$_n" -gt 1 ]; then
      printf 'disk:\n'
      printf '%s\n' "$_disk" | indent
    else
      printf 'disk: %s\n' "$_disk"
    fi
  else
    printf 'disk: unavailable (df failed)\n'
  fi
else
  if [ -n "$_df_home" ]; then
    printf 'disk: %s\n' "$_df_home"
  else
    printf 'disk: unavailable (df failed)\n'
  fi
fi

if [ "$OS" = Darwin ]; then
  _mem=$(sysctl -n hw.memsize </dev/null 2>/dev/null)
  if [ -n "$_mem" ]; then
    printf 'memory: %s\n' "$_mem"
  else
    printf 'memory: unavailable (sysctl failed)\n'
  fi
else
  _mem=$(free -m </dev/null 2>/dev/null | sed -n 2p)
  if [ -n "$_mem" ]; then
    printf 'memory: %s\n' "$_mem"
  else
    printf 'memory: unavailable (free failed)\n'
  fi
fi

_up=$(uptime </dev/null 2>/dev/null)
if [ -n "$_up" ]; then
  printf 'uptime: %s\n' "$_up"
else
  printf 'uptime: unavailable (uptime failed)\n'
fi

exit 0

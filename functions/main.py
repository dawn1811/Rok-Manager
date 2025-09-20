import os
# Ensure APPDATA exists for gspread on Windows or in environments where APPDATA is not set.
# gspread.auth.get_config_dir() reads APPDATA and will raise KeyError if it's missing. In
# ephemeral/CI environments (including some local function emulators) APPDATA can be
# undefined. Provide a safe fallback directory in the system temp folder so gspread can
# create its config files without failing the import.
if os.name == 'nt' and not os.environ.get('APPDATA'):
    import tempfile
    import pathlib
    _fallback_appdata = os.path.join(tempfile.gettempdir(), "appdata")
    pathlib.Path(_fallback_appdata).mkdir(parents=True, exist_ok=True)
    os.environ['APPDATA'] = _fallback_appdata

import re
import json
import uuid # <-- NEW: For generating player_ids

# New imports for 2nd Gen Cloud Functions
from firebase_functions import https_fn, options
# Some installations of firebase_functions may not expose ServiceAccount or set_project_id
# (version differences). Import defensively and provide no-op fallbacks so local analysis
# and deployment tooling won't crash if the symbols are missing.
try:
    from firebase_functions.core import ServiceAccount, set_project_id
except Exception:
    class ServiceAccount:
        def __init__(self, *args, **kwargs):
            raise RuntimeError("ServiceAccount is not available in this environment")

    def set_project_id(*args, **kwargs):
        # no-op fallback for environments where set_project_id isn't available
        return None

# Note: heavy/optional imports (firebase_admin, pandas, gspread, googleapiclient)
# are performed lazily inside init_services() or inside functions that need them.

# --- Configuration ---
SERVICE_ACCOUNT_KEY_CONTENT = os.environ.get('SERVICE_ACCOUNT_KEY_JSON')
KVK_FOLDER_MAPPINGS_JSON = os.environ.get('KVK_FOLDER_MAPPINGS_JSON')

# Fallback: if env vars aren't set, try reading functions/.runtimeconfig.json which
# the Firebase CLI sometimes uses for local deploy configs. This file may contain
# direct JSON or shell-style substitutions like "$(cat path/to/key.json)".
if not SERVICE_ACCOUNT_KEY_CONTENT or not KVK_FOLDER_MAPPINGS_JSON:
    try:
        rc_path = os.path.join(os.path.dirname(__file__), '.runtimeconfig.json')
        if os.path.exists(rc_path):
            with open(rc_path, 'r', encoding='utf-8') as rc_file:
                rc = json.load(rc_file)
            google_cfg = rc.get('google', {}) if isinstance(rc, dict) else {}

            if not SERVICE_ACCOUNT_KEY_CONTENT:
                sac = google_cfg.get('service_account_key_json')
                if isinstance(sac, str):
                    sac = sac.strip()
                    # handle "$(cat C:\path\to\file.json)" pattern
                    if sac.startswith('$(') and sac.endswith(')') and 'cat ' in sac:
                        try:
                            path = sac[sac.find('cat ') + 4:-1].strip()
                            path = os.path.expandvars(path)
                            with open(path, 'r', encoding='utf-8') as keyfile:
                                SERVICE_ACCOUNT_KEY_CONTENT = keyfile.read()
                        except Exception as e:
                            print(f"Warning: failed to read service account file from runtimeconfig reference: {e}")
                    else:
                        # treat the value as the raw JSON content
                        SERVICE_ACCOUNT_KEY_CONTENT = sac

            if not KVK_FOLDER_MAPPINGS_JSON:
                kfm = google_cfg.get('kvk_folder_mappings_json')
                if kfm is not None:
                    if isinstance(kfm, (dict, list)):
                        KVK_FOLDER_MAPPINGS_JSON = json.dumps(kfm)
                    else:
                        KVK_FOLDER_MAPPINGS_JSON = str(kfm)
    except Exception as e:
        print(f"Warning: unable to load .runtimeconfig.json fallback: {e}")

COLUMN_NAME_MAP = {
    # --- Governor ID mappings ---
    'Governor id': 'Governor ID', 
    'Governor ID': 'Governor ID', 
    'governor_id': 'Governor ID', 
    'governor id': 'Governor ID', 
    'Governor Id': 'Governor ID',
    'Governorid': 'Governor ID', 
    'GovernorID': 'Governor ID', 
    'governorid': 'Governor ID', 
    'GovernorId': 'Governor ID',
    
    'Governor Name': 'Governor Name', 
    'Governor Name': 'Governor Name', 
    'governor_name': 'Governor Name', 
    'governor name': 'Governor Name', 
    'Governorname': 'Governor Name', 
    'GovernorName': 'Governor Name', 
    'governorname': 'Governor Name', 
    
    'power': 'Power',
    'power': 'Power',

    'total kp': 'Total KP',
    'total KP': 'Total KP',
    'Total Kp': 'Total KP',
    'Total kp': 'Total KP',
    'totalkp': 'Total KP',
    'totalKP': 'Total KP',
    'TotalKp': 'Total KP',
    'Totalkp': 'Total KP',
    'totalKp': 'Total KP',
    'KP Total': 'Total KP',
    'Total Kill Points': 'Total KP',
    'total kill points': 'Total KP',
    'Total kill points': 'Total KP',
    'Total killpoints': 'Total KP',
    'Total KillPoints': 'Total KP',
    'Total Killpoints': 'Total KP',
    'Total Kill points': 'Total KP',

    'total dkp': 'Total DKP',
    'Total Dkp': 'Total DKP',
    'TotalDKP': 'Total DKP',
    'TotalDkp': 'Total DKP',
    'totaldkp': 'Total DKP',
    'DKP Total': 'Total DKP',
    'Dkp Total': 'Total DKP',
    'dkp total': 'Total DKP',
    'DKPTotal': 'Total DKP',
    'DkpTotal': 'Total DKP',
    'dkptotal': 'Total DKP',
    
    't4 kills': 'T4 Kills',
    'T4 Kills': 'T4 Kills',
    'tier 4 kills': 'T4 Kills',
    'Tier 4 kills': 'T4 Kills',

    't5 kills': 'T5 Kills',
    'T5 Kills': 'T5 Kills',
    'tier 5 kills': 'T5 Kills',
    'Tier 5 kills': 'T5 Kills',

    'dead': 'Deads',
    'Dead': 'Deads',
    'deads': 'Deads',
    'Deads': 'Deads',
    'Dead Troops': 'Deads',
    'dead troops': 'Deads',
    'DeadTroops': 'Deads',
    'deadtroops': 'Deads',
    
    'alliance tag': 'Alliance',
    
    'Helps Given': 'Helps',
    'HelpsGiven': 'Helps',
    'helps given': 'Helps',
    'helpsgiven': 'Helps',
    
    'resourcesGathered': 'Resources Gathered',
    
    'Lost Kingdom Count': 'Lost Kingdom Count',
    'LostKingdomCount': 'Lost Kingdom Count',
    'lost kingdom count': 'Lost Kingdom Count',
    'lostkingdomcount': 'Lost Kingdom Count',
    
    'lkMostKilled': 'LK Most Killed',
    
    'lkMostLost': 'LK Most Lost',
    
    'lkMostHealed': 'LK Most Healed',
}

MAX_BATCH_SIZE = 499

# Service handles will be initialized lazily inside the request handler to avoid
# long-running import-time initialization that can cause the Functions analyzer
# to time out during deployment analysis.
db = None
gc = None
drive_service = None


def init_services():
    """Initialize Firebase Admin SDK, gspread and Google Drive API using
    SERVICE_ACCOUNT_KEY_CONTENT (or ADC when available). Safe to call multiple
    times; will be a no-op if services are already initialized.
    """
    global db, gc, drive_service
    if db is not None and gc is not None and drive_service is not None:
        return

    # Import heavy dependencies lazily to avoid import-time side effects
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except Exception as e:
        print(f"Warning: could not import firebase_admin at init time: {e}")

    try:
        import gspread
    except Exception as e:
        print(f"Warning: could not import gspread at init time: {e}")

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
    except Exception as e:
        # We'll print warnings but continue; specific functions will handle missing APIs.
        print(f"Warning: Google API client libraries not available: {e}")

    # Initialize Firebase Admin
    try:
        if 'firebase_admin' in globals() and not firebase_admin._apps:
            if SERVICE_ACCOUNT_KEY_CONTENT:
                try:
                    sa_info = json.loads(SERVICE_ACCOUNT_KEY_CONTENT)
                    cred = credentials.Certificate(sa_info)
                    firebase_admin.initialize_app(cred)
                except Exception as inner_e:
                    print(f"Warning: failed to init Admin SDK from SERVICE_ACCOUNT_KEY_CONTENT: {inner_e}")
                    firebase_admin.initialize_app()
            else:
                firebase_admin.initialize_app()
        if 'firestore' in globals():
            db = firestore.client()
            print("Firebase Admin SDK initialized.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")

    # Initialize gspread
    try:
        if SERVICE_ACCOUNT_KEY_CONTENT and 'gspread' in globals():
            sa_info = json.loads(SERVICE_ACCOUNT_KEY_CONTENT)
            gc = gspread.service_account_from_dict(sa_info)
            print("gspread authenticated via service account content.")
        else:
            print("Warning: SERVICE_ACCOUNT_KEY_JSON not found in environment for gspread.")
        if not gc:
            raise Exception("gspread initialization failed.")
    except Exception as e:
        print(f"Error authenticating gspread: {e}")

    # Initialize Drive API
    try:
        if SERVICE_ACCOUNT_KEY_CONTENT and 'service_account' in globals() and 'build' in globals():
            sa_info = json.loads(SERVICE_ACCOUNT_KEY_CONTENT)
            creds = service_account.Credentials.from_service_account_info(sa_info, scopes=['https://www.googleapis.com/auth/drive.readonly'])
            drive_service = build('drive', 'v3', credentials=creds)
            print("Google Drive API service initialized.")
        else:
            print("Warning: SERVICE_ACCOUNT_KEY_JSON not found for Drive API init.")
        if not drive_service:
            raise Exception("Drive service initialization failed.")
    except Exception as e:
        print(f"Error initializing Google Drive API service: {e}")


# --- Helper Function: List Google Sheets in a folder ---
def list_google_sheets_in_folder(drive_svc, folder_id):
    if not drive_svc or not folder_id:
        print("Drive service or folder ID not available for listing sheets.")
        return []
    try:
        query = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
        results = drive_svc.files().list(q=query, fields="files(id, name)").execute()
        sheets = results.get('files', [])
        return sheets
    except HttpError as e:
        print(f"Error listing sheets from Drive: {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred listing sheets: {e}")
        return []

# --- Player Registry Management (in-memory) ---
# This will be loaded at the start of the function and updated in memory
player_registry = {} # { player_id: { primaryName, knownGovernorIds, knownGovernorNames, activeKvkMap, ... } }

def load_player_registry():
    global player_registry
    try:
        doc_ref = db.collection('players_registry').document('main')
        doc = doc_ref.get()
        if doc.exists:
            player_registry = doc.to_dict()
            print(f"Loaded {len(player_registry)} players from registry.")
        else:
            player_registry = {}
            print("No existing player registry found. Starting fresh.")
    except Exception as e:
        print(f"Error loading player registry: {e}. Starting with empty registry.")
        player_registry = {}

def save_player_registry():
    try:
        doc_ref = db.collection('players_registry').document('main')
        doc_ref.set(player_registry) # Overwrites the entire document
        print(f"Saved {len(player_registry)} players to registry.")
    except Exception as e:
        print(f"Error saving player registry: {e}")

# Resolves Governor ID/Name to a player_id, updating registry if needed
def resolve_player(governor_id, governor_name, kvk_identifier):
    # Normalize inputs for lookup
    norm_governor_id = str(governor_id).strip()
    norm_governor_name = governor_name.strip()

    found_player_id = None
    
    # --- Attempt 1: Find by Governor ID ---
    for pid, p_data in player_registry.items():
        if norm_governor_id in p_data.get('knownGovernorIds', []):
            found_player_id = pid
            break
    
    # --- Attempt 2: Find by Governor Name (if not found by ID) ---
    if not found_player_id:
        # Collect all player_ids that have this name in their history
        matching_pids_by_name = []
        for pid, p_data in player_registry.items():
            if norm_governor_name in p_data.get('knownGovernorNames', []):
                matching_pids_by_name.append(pid)
        
        if len(matching_pids_by_name) == 1:
            found_player_id = matching_pids_by_name[0]
        elif len(matching_pids_by_name) > 1:
            # Ambiguity: same name in history for multiple players. Log and return new player.
            print(f"Ambiguity: Governor name '{norm_governor_name}' matches multiple players. Treating as new. PIDs: {matching_pids_by_name}")
            found_player_id = None # Force creation of new player for safety
            
    # --- Player Creation / Update Logic ---
    if not found_player_id: # New player encountered
        new_pid = str(uuid.uuid4())
        player_registry[new_pid] = {
            'primaryName': norm_governor_name, # Initially use the name from the spreadsheet
            'knownGovernorIds': [norm_governor_id],
            'knownGovernorNames': [norm_governor_name],
            'activeKvkMap': {},
            'firstSeenKvk': kvk_identifier,
            'createdAt': firestore.SERVER_TIMESTAMP,
        }
        found_player_id = new_pid
        print(f"New player created: {norm_governor_name} (ID: {norm_governor_id}) -> Player_ID: {found_player_id}")
    else: # Existing player, update their profile
        player_data = player_registry[found_player_id]
        
        # Add ID if new
        if norm_governor_id not in player_data['knownGovernorIds']:
            player_data['knownGovernorIds'].append(norm_governor_id)
            print(f"  Added new Governor ID '{norm_governor_id}' to player '{player_data['primaryName']}' ({found_player_id})")

        # Add Name if new
        if norm_governor_name not in player_data['knownGovernorNames']:
            player_data['knownGovernorNames'].append(norm_governor_name)
            print(f"  Added new Governor Name '{norm_governor_name}' to player '{player_data['primaryName']}' ({found_player_id})")
        
    # Update common fields for existing/new player
    player_data = player_registry[found_player_id] # Re-fetch updated data
    player_data['currentGovernorId'] = norm_governor_id
    player_data['currentGovernorName'] = norm_governor_name
    player_data['activeKvkMap'][kvk_identifier] = True
    player_data['lastSeenKvk'] = kvk_identifier
    player_data['lastUpdated'] = firestore.SERVER_TIMESTAMP

    return found_player_id


# --- Core Processing Function for a single Google Sheet ---
def process_single_google_sheet(spreadsheet_id: str, spreadsheet_name: str, kvk_identifier: str): 
    global player_registry # Access the global registry
    if not gc:
        print(f"gspread not initialized. Cannot process sheet ID: {spreadsheet_id}")
        return 0

    total_entries_uploaded = 0
    try:
        spreadsheet = gc.open_by_id(spreadsheet_id)
        print(f"  Opened spreadsheet: {spreadsheet.title}")
    except gspread.exceptions.SpreadsheetNotFound:
        print(f"  Error: Google Sheet ID '{spreadsheet_id}' not found. Skipping.")
        return 0
    except gspread.exceptions.APIError as e:
        print(f"  Error accessing Google Sheet '{spreadsheet_id}': {e}. Skipping.")
        return 0
    except Exception as e:
        print(f"  An unexpected error occurred opening sheet '{spreadsheet_id}': {e}. Skipping.")
        return 0

    for worksheet in spreadsheet.worksheets():
        current_sheet_name = worksheet.title
        print(f"    Processing worksheet: '{current_sheet_name}' for {kvk_identifier}")

        try:
            parsed_date = pd.to_datetime(current_sheet_name, errors='coerce')
            if pd.isna(parsed_date):
                 print(f"    Warning: Could not parse date from worksheet name '{current_sheet_name}'. Attempting fallback.")
                 date_match = re.search(r'\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}|\w+\s+\d{1,2}', current_sheet_name)
                 if date_match:
                     parsed_date = pd.to_datetime(date_match.group(0), errors='coerce')
            
            if pd.isna(parsed_date):
                print(f"    Error: Failed to extract a valid date for snapshot ID from '{current_sheet_name}'. Skipping worksheet.")
                continue

            snapshot_date_id = parsed_date.strftime('%Y-%m-%d') # Format as YYYY-MM-DD
        except Exception as e:
            print(f"    Error during date parsing for '{current_sheet_name}': {e}. Skipping worksheet.")
            continue


        if not snapshot_date_id:
             print(f"    Warning: Could not determine valid snapshot ID from worksheet name '{current_sheet_name}'. Skipping worksheet.")
             continue

        try:
            records = worksheet.get_all_records()
            if not records:
                print(f"    Worksheet '{current_sheet_name}' is empty. Skipping.")
                continue
            df = pd.DataFrame(records)
        except Exception as e:
            print(f"    Error reading data from worksheet '{current_sheet_name}': {e}. Skipping.")
            continue

        df.rename(columns=COLUMN_NAME_MAP, inplace=True)

        batch = db.batch()
        batch_size = 0
        
        for index, row in df.iterrows():
            governor_id_raw = row.get('Governor ID')
            governor_name_raw = row.get('Governor Name')

            if pd.isna(governor_id_raw) or not str(governor_id_raw).strip():
                print(f"      Skipping row {index+1}: 'Governor ID' is missing or invalid.")
                continue
            if pd.isna(governor_name_raw) or not str(governor_name_raw).strip():
                print(f"      Skipping row {index+1}: 'Governor Name' is missing or invalid.")
                continue
            
            # Resolve to player_id using the central registry
            player_id = resolve_player(governor_id_raw, governor_name_raw, kvk_identifier)
            if not player_id: # Should not happen if resolve_player creates new ones, but for safety
                print(f"      Skipping row {index+1}: Could not resolve player_id for Governor ID '{governor_id_raw}'.")
                continue

            # --- Data for the KVK snapshot document (all event-specific metrics) ---
            kvk_snapshot_data = {
                'kvkIdentifier': kvk_identifier,
                'snapshotDateId': snapshot_date_id,
                'Governor ID': str(governor_id_raw).strip(), # Store for context
                'Governor Name': str(governor_name_raw).strip(), # Store for context
                'timestampUploaded': firestore.SERVER_TIMESTAMP,
                'sourceSpreadsheet': spreadsheet_name,
                'sourceWorksheet': current_sheet_name,
            }
            
            for col_alias in COLUMN_NAME_MAP.values():
                if col_alias not in ['Governor ID', 'Governor Name']:
                    value = row.get(col_alias)
                    if pd.notna(value):
                        if isinstance(value, str):
                            cleaned_value = value.replace(',', '')
                            if cleaned_value.replace('.', '', 1).isdigit():
                                if '.' in cleaned_value:
                                    kvk_snapshot_data[col_alias] = float(cleaned_value)
                                else:
                                    kvk_snapshot_data[col_alias] = int(cleaned_value)
                            else:
                                kvk_snapshot_data[col_alias] = value
                        else:
                            kvk_snapshot_data[col_alias] = value

            kvk_snapshot_data_to_upload = {k: v for k, v in kvk_snapshot_data.items() if pd.notna(v)}

            # --- Firestore Document References and Batch Operations ---
            # Now, top-level collection is 'players', keyed by player_id
            kvk_snapshot_doc_ref = db.collection('players').document(player_id).collection('kvkEvents').document(kvk_identifier).collection('snapshots').document(snapshot_date_id)
            
            # We don't update the top-level player document *in this batch* because
            # player_registry is updated in memory and saved once at the end.
            # This avoids conflicts and makes batch simpler.
            
            batch.set(kvk_snapshot_doc_ref, kvk_snapshot_data_to_upload)
            batch_size += 1
            total_entries_uploaded += 1

            if batch_size >= MAX_BATCH_SIZE:
                try:
                    batch.commit()
                    print(f"      Committed {batch_size} operations for worksheet '{current_sheet_name}'.")
                    batch = db.batch()
                    batch_size = 0
                except Exception as e:
                    print(f"      Error committing batch for worksheet '{current_sheet_name}': {e}")
        if batch_size > 0:
            try:
                batch.commit()
                print(f"      Committed final {batch_size} operations for worksheet '{current_sheet_name}'.")
            except Exception as e:
                print(f"      Error committing final batch for worksheet '{current_sheet_name}': {e}")

    print(f"  Finished processing Google Sheet file: '{spreadsheet_name}'")
    return total_entries_uploaded

# --- Cloud Function Entry Point ---
# Build decorator args in a version-tolerant way: some firebase_functions
# releases may not expose MemoryOption/CpuOption. Try to use them if available,
# otherwise call the decorator with minimal args.
_https_decorator_kwargs = {}
try:
    if hasattr(options, 'MemoryOption'):
        _https_decorator_kwargs['memory'] = options.MemoryOption.GB_1
except Exception:
    pass
try:
    _https_decorator_kwargs['timeout_sec'] = 540
except Exception:
    pass
try:
    if hasattr(options, 'CpuOption'):
        _https_decorator_kwargs['cpu'] = options.CpuOption.gcf_gen2()
except Exception:
    pass


@https_fn.on_request(**_https_decorator_kwargs)
def process_kvk_spreadsheets(request: https_fn.Request) -> https_fn.Response:
    print("Cloud Function 'process_kvk_spreadsheets' triggered.")

    # Lazy-initialize external services to avoid import-time side effects during
    # the Firebase Functions analysis phase which can time out.
    init_services()

    if not KVK_FOLDER_MAPPINGS_JSON:
        error_msg = "Error: KVK_FOLDER_MAPPINGS_JSON environment variable not set."
        print(error_msg)
        return https_fn.Response(error_msg, status=500)

    if not gc or not drive_service:
        error_msg = "Error: gspread or Drive API service not initialized (check SERVICE_ACCOUNT_KEY_JSON)."
        print(error_msg)
        return https_fn.Response(error_msg, status=500)

    try:
        kvk_folder_map = json.loads(KVK_FOLDER_MAPPINGS_JSON)
        if not isinstance(kvk_folder_map, dict):
            raise ValueError("KVK_FOLDER_MAPPINGS_JSON is not a valid JSON dictionary.")
    except (json.JSONDecodeError, ValueError) as e:
        error_msg = f"Error parsing KVK_FOLDER_MAPPINGS_JSON: {e}. Ensure it's a valid JSON string."
        print(error_msg)
        return https_fn.Response(error_msg, status=500)

    # --- Load the player registry at the beginning of the function run ---
    load_player_registry()

    total_sheets_processed = 0
    total_entries_uploaded = 0

    for folder_id, kvk_identifier in kvk_folder_map.items():
        print(f"\n--- Processing KVK '{kvk_identifier}' from Folder ID: {folder_id} ---")
        sheets_in_kvk_folder = list_google_sheets_in_folder(drive_service, folder_id)
        
        if not sheets_in_kvk_folder:
            print(f"No sheets found for KVK '{kvk_identifier}' in folder '{folder_id}'.")
            continue

        for sheet_info in sheets_in_kvk_folder:
            total_sheets_processed += 1
            spreadsheet_id = sheet_info['id']
            spreadsheet_name = sheet_info['name']
            print(f"  Processing spreadsheet: '{spreadsheet_name}' (ID: {spreadsheet_id}) for KVK '{kvk_identifier}'")
            
            uploaded_count = process_single_google_sheet(spreadsheet_id, spreadsheet_name, kvk_identifier)
            total_entries_uploaded += uploaded_count
        
    # --- Save the updated player registry at the end of the function run ---
    save_player_registry()

    print(f"\nCloud Function finished. Total sheets processed: {total_sheets_processed}. Total entries uploaded: {total_entries_uploaded}")
    return https_fn.Response(f"Successfully processed {total_sheets_processed} sheets. Total entries: {total_entries_uploaded}", status=200)


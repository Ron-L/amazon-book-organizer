        // ARCHITECTURE: See docs/design/ARCHITECTURE.md for Version Management, Status Icons, Cache-Busting patterns
        const { useState, useEffect, useRef } = React;
        const APP_VERSION = "5.0.10";  // Release version shown to users
        const ORGANIZER_VERSION = "5.1.0-alpha.10";  // Build version for this file

        // v5.0.0-alpha.172.1 - Static column configuration (outside component for performance)
        const COLUMN_CONFIG = {
            title: { label: 'Name', sortKey: 'title', defaultDir: 'asc', cssVar: '--col-title', alwaysVisible: true },
            author: { label: 'Author', sortKey: 'author', defaultDir: 'asc', cssVar: '--col-author' },
            series: { label: 'Series', sortKey: 'series', defaultDir: 'asc', cssVar: '--col-series' },
            seriesNum: { label: '#', sortKey: 'seriesNum', defaultDir: 'asc', cssVar: '--col-seriesNum', textCenter: true },
            rating: { label: 'Rating', sortKey: 'rating', defaultDir: 'asc', cssVar: '--col-rating' },
            myRating: { label: 'My Rating', sortKey: 'myRating', defaultDir: 'desc', cssVar: '--col-myRating' },
            dateAdded: { label: 'Date Added', sortKey: 'dateAdded', defaultDir: 'desc', cssVar: '--col-dateAdded' },
            price: { label: 'Price', sortKey: 'price', defaultDir: 'asc', cssVar: '--col-price' },
            priceGoal: { label: 'Goal', sortKey: 'priceGoal', defaultDir: 'asc', cssVar: '--col-priceGoal' },
            delta: { label: 'Under', sortKey: 'delta', defaultDir: 'desc', cssVar: '--col-delta' },
            amazon: { label: 'Amazon', sortKey: null, cssVar: '--col-amazon', textCenter: true, noResize: true }
        };
        document.title = "ReaderWrangler";
        // Constants and helper functions moved to uiHelpers.js and storage.js (v5.0.0)
        // saveBooksToIndexedDB, loadBooksFromIndexedDB, clearIndexedDB - see storage.js
        // normalizeBook, parsePrice, getAmazonUrl, calculateFreshness, formatRelativeTime - see uiHelpers.js
        // buildCoverUrlMap, populateCoverCache - see storage.js

        // v5.0.0-alpha.130: Reusable info dialog for large messages (avoids alert() scrollbar issues)
        function showInfoDialog(title, message) {
            return new Promise((resolve) => {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                `;

                // Create dialog
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;

                // Create title
                const titleEl = document.createElement('h2');
                titleEl.textContent = title;
                titleEl.style.cssText = `
                    margin: 0 0 16px 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #333;
                `;

                // Create message
                const messageEl = document.createElement('div');
                messageEl.style.cssText = `
                    margin-bottom: 24px;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #555;
                    white-space: pre-line;
                `;
                messageEl.textContent = message;

                // Create OK button
                const button = document.createElement('button');
                button.textContent = 'OK';
                button.style.cssText = `
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 10px 24px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    float: right;
                `;
                button.onmouseover = () => button.style.background = '#0056b3';
                button.onmouseout = () => button.style.background = '#007bff';

                button.onclick = () => {
                    document.body.removeChild(overlay);
                    resolve();
                };

                // Assemble dialog
                dialog.appendChild(titleEl);
                dialog.appendChild(messageEl);
                dialog.appendChild(button);
                overlay.appendChild(dialog);

                // Show dialog
                document.body.appendChild(overlay);
            });
        }

        // v5.0.9 - Custom dialog for backup restore completion
        function showBackupRestoredDialog(bookCount) {
            return new Promise((resolve) => {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                `;

                // Create dialog
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;

                // Create content
                dialog.innerHTML = `
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #28a745;">
                        ✓ Backup Restored (${bookCount} books)
                    </h2>
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;">
                        Next: Update your library file
                    </h3>
                    <div style="margin-bottom: 16px; font-size: 14px; line-height: 1.6; color: #555;">
                        <p style="margin: 0 0 8px 0; font-weight: 500;">When the save dialog appears:</p>
                        <div style="margin-left: 8px;">
                            <div style="margin: 4px 0;">✓ Keep filename: <strong>amazon-library.json</strong></div>
                            <div style="margin: 4px 0;">✓ Replace existing file</div>
                            <div style="margin: 4px 0;">✗ Don't save as <strong>amazon-library(1).json</strong></div>
                        </div>
                    </div>
                    <div style="margin-bottom: 20px; padding: 12px; background: #e7f3ff; border-left: 3px solid #007bff; font-size: 13px; color: #555;">
                        💡 This keeps your bookmarklet in sync
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button id="whyReplaceBtn" style="background: transparent; color: #007bff; border: 1px solid #007bff; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
                            ? Why replace?
                        </button>
                        <button id="cancelBtn" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
                            Cancel
                        </button>
                        <button id="saveBtn" style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            Save File
                        </button>
                    </div>
                `;

                // Add button hover effects and handlers
                const whyBtn = dialog.querySelector('#whyReplaceBtn');
                const cancelBtn = dialog.querySelector('#cancelBtn');
                const saveBtn = dialog.querySelector('#saveBtn');

                whyBtn.onmouseover = () => whyBtn.style.background = '#e7f3ff';
                whyBtn.onmouseout = () => whyBtn.style.background = 'transparent';

                cancelBtn.onmouseover = () => cancelBtn.style.background = '#5a6268';
                cancelBtn.onmouseout = () => cancelBtn.style.background = '#6c757d';

                saveBtn.onmouseover = () => saveBtn.style.background = '#218838';
                saveBtn.onmouseout = () => saveBtn.style.background = '#28a745';

                // Why replace? button - show help popup
                whyBtn.onclick = () => {
                    showInfoDialog(
                        'Why replace the file?',
                        `Your backup contains:\n` +
                        `• Library data (books from a prior amazon-library.json)\n` +
                        `• Your organization (order, folders, tags, notes, price goals)\n\n` +
                        `When restored:\n` +
                        `1. ✓ Organization loaded into app\n` +
                        `2. → amazon-library.json needs updating\n\n` +
                        `If you skip this or save as (1):\n` +
                        `• Next bookmarklet use will load prior data\n` +
                        `• May import books from different account or time period`
                    );
                };

                // Cancel button - close without saving
                cancelBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(false);
                };

                // Save File button - proceed with download
                saveBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(true);
                };

                // Assemble and show
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);
            });
        }

        function ReaderWrangler() {
            const [books, setBooks] = useState([]);
            const [columns, setColumns] = useState([{ id: 'unorganized', name: 'Unorganized', books: [] }]);
            const [searchTerm, setSearchTerm] = useState('');
            const [draggedBook, setDraggedBook] = useState(null);
            const [draggedFromColumn, setDraggedFromColumn] = useState(null);
            const [draggedBookIndex, setDraggedBookIndex] = useState(null); // v4.16.0.d - Track dragged book's index
            const [draggedColumn, setDraggedColumn] = useState(null);
            const [columnDropTarget, setColumnDropTarget] = useState(null);
            const [modalBook, setModalBook] = useState(null);
            const [modalColumnId, setModalColumnId] = useState(null);
            const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
            const [dragCurrentPos, setDragCurrentPos] = useState({ x: 0, y: 0 });
            const [isDragging, setIsDragging] = useState(false);
            const [isDraggingColumn, setIsDraggingColumn] = useState(false);
            // v3.14.0.w - dropTarget moved to ref (dropTargetRef) to avoid React re-renders
            const [dataSource, setDataSource] = useState('none');
            const [blankImageBooks, setBlankImageBooks] = useState(new Set());
            const [editingColumn, setEditingColumn] = useState(null);
            const [editingName, setEditingName] = useState('');
            const [sortMenuOpen, setSortMenuOpen] = useState(null);
            const [columnMenuOpen, setColumnMenuOpen] = useState(null); // v3.11.0 - Unified column dropdown menu
            const [editingDivider, setEditingDivider] = useState(null); // v3.11.0 - {columnId, dividerId}
            const [editingDividerLabel, setEditingDividerLabel] = useState(''); // v3.11.0
            const [insertDividerOpen, setInsertDividerOpen] = useState(null); // v3.11.0 - columnId for Insert Divider modal
            const [newDividerLabel, setNewDividerLabel] = useState(''); // v3.11.0
            const [hoveringDivider, setHoveringDivider] = useState(null); // v3.11.0 - {columnId, dividerId}
            // v5.0.0-alpha.175.48 - Removed helpOpen and settingsOpen (dead code)
            // v5.0.0-alpha.175.1 - Menu bar state
            const [openMenuBar, setOpenMenuBar] = useState(null); // 'file' | 'view' | 'help' | null
            const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
            const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
            const [howToDialogOpen, setHowToDialogOpen] = useState(false);
            // v5.0.0-alpha.175.4 - Toolbar filter dropdown state
            const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
            const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false);
            const [typesDropdownOpen, setTypesDropdownOpen] = useState(false);
            // v5.0.0-alpha.175.40 - Phase 5.1: More panel state
            const [morePanelOpen, setMorePanelOpen] = useState(false);
            // v5.0.0-alpha.175.41 - Phase 5.2: More panel filter dropdowns
            const [collectionsDropdownOpen, setCollectionsDropdownOpen] = useState(false);
            // v5.0.0-alpha.175.42 - Phase 5.3: Amazon Rating dropdown
            const [amazonRatingDropdownOpen, setAmazonRatingDropdownOpen] = useState(false);
            // v5.0.0-alpha.175.43 - Phase 5.4: My Rating dropdown
            const [myRatingDropdownOpen, setMyRatingDropdownOpen] = useState(false);
            // v5.0.0-alpha.175.44 - Phase 5.5: Series dropdown
            const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
            // v5.0.0-alpha.175.45 - Phase 5.6: Date dropdown
            const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
            const [deleteDialogOpen, setDeleteDialogOpen] = useState(null);
            const [deleteDestination, setDeleteDestination] = useState('');
            // v4.16.0.aq - State for "last copy" delete warning dialog
            const [lastCopyDialogData, setLastCopyDialogData] = useState(null); // {lastCopyEntries: [...], deletableEntries: [...], deletedCount: number}
            const [showAllReviews, setShowAllReviews] = useState(false);
            const [customPriceInput, setCustomPriceInput] = useState(''); // v4.17.0 - custom price trigger input
            const [showCustomPriceInput, setShowCustomPriceInput] = useState(false); // v4.17.0
            const [showBulkPriceModal, setShowBulkPriceModal] = useState(false); // v4.20.0.a - bulk price goal modal
            const [bulkPriceInput, setBulkPriceInput] = useState(''); // v4.20.0.a - bulk price goal input
            const [bulkPriceBookIds, setBulkPriceBookIds] = useState([]); // v5.0.0-alpha.169.8 - store book IDs when modal opens
            const [isEditingNote, setIsEditingNote] = useState(false); // v4.21.0.a - book note edit mode
            const [noteEditContent, setNoteEditContent] = useState(''); // v4.21.0.a - book note editor content
            const [tagInputValue, setTagInputValue] = useState(''); // v4.27.0 - tag input autocomplete value
            const [dividerContextMenu, setDividerContextMenu] = useState(null); // v4.27.0 - {x, y, columnId, dividerId, divider}
            const [dividerTagEditorOpen, setDividerTagEditorOpen] = useState(null); // v4.27.0 - {columnId, dividerId} for editing div tags
            const [tagManagementOpen, setTagManagementOpen] = useState(false); // v4.27.0 Phase 3 - Tag management modal
            const [editingTagId, setEditingTagId] = useState(null); // v4.27.0 Phase 3 - Currently renaming tag
            const [collectSeriesOpen, setCollectSeriesOpen] = useState(false);
            const [seriesBooks, setSeriesBooks] = useState({ current: [], other: [] });
            const [wizardModalOpen, setWizardModalOpen] = useState(false); // v5.1.0 - Auto-organize wizard modal
            const [wizardMinBooksSlider, setWizardMinBooksSlider] = useState(5); // v5.1.0-alpha.10 - Slider value (immediate)
            const [wizardMinBooks, setWizardMinBooks] = useState(5); // v5.1.0-alpha.10 - Debounced threshold for detection
            const [wizardSortBy, setWizardSortBy] = useState('bookCount'); // v5.1.0-alpha.10 - Sort by bookCount or authorName
            const [wizardAuthors, setWizardAuthors] = useState([]); // v5.1.0-alpha.4 - Detected authors array
            const [wizardSelectedAuthors, setWizardSelectedAuthors] = useState(new Set()); // v5.1.0-alpha.5 - Selected author normalized names
            const [wizardHelpOpen, setWizardHelpOpen] = useState(false); // v5.1.0-alpha.10 - Help dialog
            const [syncStatus, setSyncStatusInternal] = useState('loading'); // 'loading', 'fresh', 'stale', 'none', 'unknown'
            const [lastSyncTime, setLastSyncTime] = useState(null);
            // manifestData state removed in v3.7.0.m - replaced by libraryStatus/collectionsStatus
            const [statusModalOpen, setStatusModalOpen] = useState(false);
            const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
            const [collectionsData, setCollectionsData] = useState(null); // Map of ASIN -> {readStatus, collections[]}
            const [collectionFilter, setCollectionFilter] = useState(''); // Filter by collection name or special values
            const [selectedBooks, setSelectedBooks] = useState(new Set()); // Multi-select state
            const [lastClickedBook, setLastClickedBook] = useState(null); // For shift+click range selection
            // v4.8.0 - Undo/Redo state
            const [undoStack, setUndoStack] = useState([]); // Array of action records
            const [redoStack, setRedoStack] = useState([]); // Array of action records
            const undoStackRef = useRef(undoStack); // Ref to avoid stale closure in keyboard handler
            const redoStackRef = useRef(redoStack);
            const modalBookRef = useRef(modalBook); // v4.21.0.g - Ref to check modal state in keyboard handler
            const [selectedDivider, setSelectedDivider] = useState(null); // v3.13.0 - Selected divider {columnId, dividerId}
            const [activeColumnId, setActiveColumnId] = useState(null); // Track which column has focus for Ctrl+A
            const [contextMenu, setContextMenu] = useState(null); // {x, y, bookId, columnId}
            const [contextSubmenu, setContextSubmenu] = useState(null); // v4.16.0.ba - 'move' | 'copyTo' | 'priceGoal' | null for submenu hover
            const [readStatusFilter, setReadStatusFilter] = useState(''); // Filter by READ/UNREAD/UNKNOWN
            const [ratingFilter, setRatingFilter] = useState(''); // Filter by minimum rating (NEW v3.8.0)
            const [dealsFilterActive, setDealsFilterActive] = useState(false); // v4.17.0.j - Deals filter toggle
            const [ownershipFilter, setOwnershipFilter] = useState(''); // Filter by ownership type (NEW v4.9.0)
            const [seriesFilter, setSeriesFilter] = useState(''); // Filter by series name or "NOT_IN_SERIES" (NEW v3.8.0.k)
            const [dateFrom, setDateFrom] = useState(''); // Filter by acquisition date from (YYYY-MM-DD) (NEW v3.8.0.k)
            const [dateTo, setDateTo] = useState(''); // Filter by acquisition date to (YYYY-MM-DD) (NEW v3.8.0.k)
            const [datePreset, setDatePreset] = useState(''); // Date filter preset: '' | 'last30' | 'last90' | 'lastYear' | '2025' | '2024' | '2023' | 'custom' (NEW v4.15.6)
            const [tagFilter, setTagFilter] = useState([]); // v4.27.0 - Filter by tags (array of tag names, OR logic)
            const [tagRegistry, setTagRegistry] = useState({}); // v4.27.0 - Central tag registry {tagName: {label, count}}
            const [selectedCollections, setSelectedCollections] = useState([]); // v5.0.0-alpha.175.41 - Phase 5.2: Collections filter (array, OR logic)
            const [minAmazonRating, setMinAmazonRating] = useState(''); // v5.0.0-alpha.175.42 - Phase 5.3: Amazon Rating filter (single-select, minimum rating)
            const [minMyRating, setMinMyRating] = useState(''); // v5.0.0-alpha.175.43 - Phase 5.4: My Rating filter (single-select, '' = all, 'unrated' = 0, '1'-'5' = minimum rating)
            const [selectedSeries, setSelectedSeries] = useState([]); // v5.0.0-alpha.175.44 - Phase 5.5: Series filter (array, OR logic, NOT_IN_SERIES special value)
            // v5.0.0-alpha.175.47 - Phase 7: Removed filterPanelOpen and showAdvancedFilters (old filter bar removed)
            const [showHidden, setShowHidden] = useState(false); // Show hidden books toggle (NEW v4.1.0.d)
            const [, forceUpdate] = useState({});
            const [coverUrlMap, setCoverUrlMap] = useState({}); // Cover image cache URL map (v4.13.0)
            // v4.16.0 - Clipboard state for Cut/Copy/Paste
            const [clipboard, setClipboard] = useState(null); // {type: 'cut'|'copy', bookIds: [], sourcePositions: []}
            // v4.16.0.g - Clipboard status message for footer
            const [clipboardMessage, setClipboardMessage] = useState(null); // "3 books cut" or "5 books copied"
            // v4.16.0.l - Toast animation state
            const [toastVisible, setToastVisible] = useState(false);
            const [toastAnimating, setToastAnimating] = useState(false);
            // v4.16.0.m - Track position of last selected book for toast placement
            const [toastPosition, setToastPosition] = useState({ x: 0, y: 0 });
            // v4.16.0.o - Footer clipboard text only visible after toast lands
            const [footerClipboardVisible, setFooterClipboardVisible] = useState(false);
            // v4.16.0.s - Per-instance hidden state (Set of instanceIds)
            const [hiddenInstances, setHiddenInstances] = useState(new Set());

            // v5.0.0 - Book Explorer state
            // v5.0.2 - Removed viewMode (app always uses Explorer mode, v4 Column App fully removed)
            const [folders, setFolders] = useState([]); // User-created folders
            const [selectedFolderId, setSelectedFolderId] = useState('__all__'); // Current folder
            // v5.0.0-alpha.174 - Multi-column sorting: array of sort criteria (max 3)
            const [explorerSort, setExplorerSort] = useState([{ column: 'dateAdded', direction: 'desc' }]);
            const [folderSortSettings, setFolderSortSettings] = useState({}); // v5.0.0-alpha.100 - Per-folder sort settings map {folderId: sort array}
            const [explorerView, setExplorerView] = useState('list'); // 'list' | 'covers'
            const [explorerCoverCols, setExplorerCoverCols] = useState(56); // Slider value (4-60), actual cols = 64-value
            const [editingFolderId, setEditingFolderId] = useState(null); // Folder being renamed (left panel)
            const [editingFolderName, setEditingFolderName] = useState(''); // Folder rename input (left panel)
            const [isPlaceholderMode, setIsPlaceholderMode] = useState(false); // v5.0.0-alpha.134 - Placeholder text mode for new folder rename (left panel)
            const [rightPanelEditingId, setRightPanelEditingId] = useState(null); // v5.0.0-alpha.156 - Folder being renamed (right panel)
            const [rightPanelEditingName, setRightPanelEditingName] = useState(''); // v5.0.0-alpha.156 - Folder rename input (right panel)
            const [rightPanelPlaceholderMode, setRightPanelPlaceholderMode] = useState(false); // v5.0.0-alpha.156 - Placeholder mode (right panel)
            const [explorerDragBookId, setExplorerDragBookId] = useState(null); // Book being dragged in Explorer
            const [explorerDropTargetId, setExplorerDropTargetId] = useState(null); // Folder being dragged over
            const [explorerSelectedBooks, setExplorerSelectedBooks] = useState(new Set()); // Multi-select in Explorer
            const [explorerSelectedFolders, setExplorerSelectedFolders] = useState(new Set()); // v5.0.0-alpha.54 - Folder selection in right pane
            const [explorerSelectionAnchor, setExplorerSelectionAnchor] = useState(null); // Anchor index for Shift+click range select
            const [explorerBookContextMenu, setExplorerBookContextMenu] = useState(null); // v5.0.0-alpha.165 - Book context menu in Explorer (separate from Columns App menu)
            const [explorerReorderTarget, setExplorerReorderTarget] = useState(null); // Index for reorder drop target
            const [explorerFolderDragTarget, setExplorerFolderDragTarget] = useState(null); // v5.0.0-alpha.69 - { type: 'reorder'|'reparent', index?, position?, folderId? }
            const [explorerIsCopyDrag, setExplorerIsCopyDrag] = useState(false); // Ctrl key pressed during drag
            const [explorerDragData, setExplorerDragData] = useState(null); // { sourceFolder, bookIds } for drag validity checks
            const [breadcrumbDropTargetId, setBreadcrumbDropTargetId] = useState(null); // v5.0.0-alpha.83 - Breadcrumb folder being dragged over
            const [sidebarFolderDragTarget, setSidebarFolderDragTarget] = useState(null); // v5.0.0-alpha.86 - { type: 'reorder'|'reparent', folderId, position? }
            // v5.1.0 - Removed showMigrationDialog (v4 Column App migration no longer needed)
            const [leftPaneWidth, setLeftPaneWidth] = useState(256); // v5.0.0-alpha.91 - Resizable left pane width (px)
            const [isResizingPane, setIsResizingPane] = useState(false); // v5.0.0-alpha.91 - Pane resize in progress
            const [navHistory, setNavHistory] = useState(['__all__']); // v5.0.0-alpha.92 - Navigation history stack
            const [navHistoryIndex, setNavHistoryIndex] = useState(0); // v5.0.0-alpha.92 - Current position in history
            const [bookTooltip, setBookTooltip] = useState(null); // v5.0.0-alpha.98 - Tooltip for All Books view { bookId, x, y }
            const [folderContextMenu, setFolderContextMenu] = useState(null); // v5.0.0-alpha.133 - Folder context menu { folderId, x, y }
            const [submenuExpandedFolders, setSubmenuExpandedFolders] = useState(new Set()); // v5.0.0-alpha.138 - Expanded folders in Move to submenu
            const [folderClipboard, setFolderClipboard] = useState({ items: [], operation: null }); // v5.0.0-alpha.141 - Clipboard for cut/copy/paste
            const [folderPropertiesDialog, setFolderPropertiesDialog] = useState(null); // v5.0.0-alpha.142 - Folder properties dialog { folderId }
            const [folderPropertiesEditedName, setFolderPropertiesEditedName] = useState(''); // v5.0.0-alpha.143 - Edited name in properties dialog
            const [dialogDrag, setDialogDrag] = useState(null); // v5.0.0-alpha.144 - Dragging state { isDragging, offsetX, offsetY, dialogX, dialogY }
            const [showAllFoldersOverride, setShowAllFoldersOverride] = useState(false); // v5.0.0-alpha.169 - Override auto-hide when filter active
            const [savedExpansionState, setSavedExpansionState] = useState(null); // v5.0.0-alpha.169 - Saved folder expansion state (Map of folderId → collapsed)
            const [visibleColumns, setVisibleColumns] = useState({ // v5.0.0-alpha.104 - Column visibility (Name always visible)
                author: true,
                series: false, // v5.0.0-alpha.171 - Series name column (hidden by default)
                seriesNum: false, // v5.0.0-alpha.171 - Series position column (hidden by default)
                rating: true,
                myRating: false, // v5.0.0-alpha.175.31 - Personal rating column (hidden by default)
                dateAdded: true,
                price: true,
                priceGoal: true,
                delta: true,
                amazon: false // v5.0.0-alpha.167.6 - Amazon link column (hidden by default)
            });
            const [explorerColumnMenuOpen, setExplorerColumnMenuOpen] = useState(false); // v5.0.0-alpha.104 - Explorer column chooser menu
            const [explorerColumnMenuPos, setExplorerColumnMenuPos] = useState(null); // v5.0.0-alpha.107 - Context menu position { x, y } or null
            const [columnWidths, setColumnWidths] = useState({ // v5.0.0-alpha.109 - Column widths (px)
                title: 200,
                author: 150,
                series: 150, // v5.0.0-alpha.171 - Series name column width
                seriesNum: 50, // v5.0.0-alpha.171 - Series position column width
                rating: 96,
                myRating: 100, // v5.0.0-alpha.175.31 - Personal rating column width
                dateAdded: 112,
                price: 80,
                priceGoal: 80,
                delta: 80,
                amazon: 70 // v5.0.0-alpha.167.6 - Amazon link column width
            });
            const [resizingColumn, setResizingColumn] = useState(null); // v5.0.0-alpha.109 - { columnId, startX, startWidth }
            const [columnOrder, setColumnOrder] = useState([ // v5.0.0-alpha.172 - Column display order (drag to reorder)
                'title', 'author', 'series', 'seriesNum', 'rating', 'myRating',
                'dateAdded', 'price', 'priceGoal', 'delta', 'amazon'
            ]);
            const [draggingColumn, setDraggingColumn] = useState(null); // v5.0.0-alpha.172 - Column header being dragged
            const [headerDropTarget, setHeaderDropTarget] = useState(null); // v5.0.0-alpha.172 - { column, side: 'left'|'right' }

            // v5.0.0 - Special folders
            const FOLDER_ALL_BOOKS = { id: '__all__', name: 'All Books', virtual: true, icon: '📚' };
            const FOLDER_LIBRARY = { id: '__library__', name: 'My Library', virtual: true, icon: '📚' }; // v5.0.0-alpha.63
            const FOLDER_INBOX = { id: '__inbox__', name: 'Inbox', virtual: false, icon: '📥', isInbox: true };

            // v4.16.0.s - Helper to extract bookId from column entry (handles legacy string and new object format)
            // Entry types: string (legacy bookId), {type:'divider',...}, {instanceId, bookId} (new format)
            const getBookIdFromEntry = (entry) => {
                if (typeof entry === 'string') return entry;  // Legacy format
                if (entry && entry.type === 'divider') return null;  // Divider
                if (entry && entry.bookId) return entry.bookId;  // New instance format
                return null;
            };

            // v4.16.0.s - Helper to get instanceId from entry (null for legacy entries)
            const getInstanceId = (entry) => {
                if (typeof entry === 'string') return null;  // Legacy format has no instanceId
                if (entry && entry.instanceId) return entry.instanceId;
                return null;
            };

            // v4.16.0.s - Generate UUID for new instances
            const generateInstanceId = () => {
                return 'inst-' + crypto.randomUUID();
            };

            // v4.16.0.s - Helper to check if a column contains a specific bookId
            const columnHasBook = (columnBooks, bookId) => {
                return columnBooks.some(entry => getBookIdFromEntry(entry) === bookId);
            };

            // v4.27.0 - Get inherited tags for a book based on its position in columns
            // Books inherit tags from the divider above them (until next divider)
            const getInheritedTags = (bookId, columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return [];

                let currentDivTags = [];
                for (const entry of column.books) {
                    if (entry && entry.type === 'divider') {
                        currentDivTags = entry.tags || [];
                    } else {
                        const entryBookId = getBookIdFromEntry(entry);
                        if (entryBookId === bookId) {
                            return currentDivTags;
                        }
                    }
                }
                return [];
            };

            // v4.16.0.s - Helper to find index of bookId in column (first occurrence)
            const findBookIndexInColumn = (columnBooks, bookId) => {
                return columnBooks.findIndex(entry => getBookIdFromEntry(entry) === bookId);
            };

            // v5.0.0 - Book Explorer folder helpers
            // Get all book IDs that are in any user folder (not Inbox)
            const getBooksInUserFolders = () => {
                const inFolders = new Set();
                folders.forEach(folder => {
                    if (folder.id !== '__inbox__') {
                        (folder.bookIds || []).forEach(id => inFolders.add(id));
                    }
                });
                return inFolders;
            };

            // Get the Inbox folder from folders array
            const getInboxFolder = () => folders.find(f => f.id === '__inbox__');

            // v5.0.0-alpha.175.9 - Compute tag count on-the-fly (replaces stored counts)
            const getTagCount = (tagId) => {
                return books.filter(b => b.tags?.includes(tagId)).length;
            };

            // Get books for a folder (handles All Books and My Library virtual folders)
            const getFolderBookIds = (folderId) => {
                if (folderId === '__all__') return [...books.map(b => b.id)].reverse(); // Newest first
                if (folderId === '__library__') return []; // v5.0.0-alpha.63 - My Library shows folders, not books
                const folder = folders.find(f => f.id === folderId);
                return folder?.bookIds || [];
            };

            // Filter a single book for Explorer view (applies all active filters)
            const filterBookForExplorer = (book) => {
                if (!book) return false;

                // Text search filter
                const matchesSearch = !searchTerm ||
                    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    book.author.toLowerCase().includes(searchTerm.toLowerCase());

                // Read status filter
                const matchesReadStatus = !readStatusFilter || book.readStatus === readStatusFilter;

                // Collection filter
                let matchesCollection = true;
                if (collectionFilter) {
                    if (collectionFilter === 'UNCOLLECTED') {
                        matchesCollection = !book.collections || book.collections.length === 0;
                    } else {
                        matchesCollection = book.collections &&
                            book.collections.some(c => c.name === collectionFilter);
                    }
                }

                // Collections filter (v5.0.0-alpha.175.41 - Phase 5.2: Multi-select)
                let matchesCollections = true;
                if (selectedCollections.length > 0) {
                    const hasUncollected = selectedCollections.includes('UNCOLLECTED');
                    const otherCollections = selectedCollections.filter(c => c !== 'UNCOLLECTED');

                    const bookCollections = book.collections || [];
                    const isInCollection = otherCollections.some(c =>
                        bookCollections.some(bc => bc.name === c)
                    );
                    const isUncollected = bookCollections.length === 0;

                    matchesCollections = (hasUncollected && isUncollected) || isInCollection;
                }

                // Amazon Rating filter (v5.0.0-alpha.175.42 - Phase 5.3: Minimum rating)
                const matchesAmazonRating = !minAmazonRating ||
                    (book.rating !== undefined && book.rating >= parseFloat(minAmazonRating));

                // My Rating filter (v5.0.0-alpha.175.43 - Phase 5.4: Personal rating with Unrated option)
                let matchesMyRating = true;
                if (minMyRating) {
                    if (minMyRating === 'unrated') {
                        matchesMyRating = (book.myRating || 0) === 0;
                    } else {
                        const minRating = parseFloat(minMyRating);
                        matchesMyRating = (book.myRating || 0) >= minRating;
                    }
                }

                // Rating filter
                const matchesRating = !ratingFilter || (book.rating >= parseFloat(ratingFilter));

                // Ownership type filter (v5.0.4 - wishlist checks both fields for backward compatibility)
                const matchesOwnership = !ownershipFilter ||
                    (ownershipFilter === 'wishlist'
                        ? (book.onWishlist || book.ownershipType === 'wishlist')
                        : (book.ownershipType || 'purchased') === ownershipFilter);

                // Hidden filter (book-level for Explorer)
                const matchesHidden = showHidden || !book.isHidden;

                // Series filter
                let matchesSeries = true;
                if (seriesFilter) {
                    if (seriesFilter === 'NOT_IN_SERIES') {
                        matchesSeries = !book.series || book.series.trim() === '';
                    } else {
                        matchesSeries = book.series && book.series === seriesFilter;
                    }
                }

                // Date range filter
                let matchesDateRange = true;
                if (dateFrom || dateTo) {
                    if (book.acquired) {
                        const bookDate = new Date(parseInt(book.acquired)).toISOString().split('T')[0];
                        const fromDate = dateFrom || '0000-01-01';
                        const toDate = dateTo || new Date().toISOString().split('T')[0];
                        if (bookDate < fromDate || bookDate > toDate) {
                            matchesDateRange = false;
                        }
                    } else {
                        matchesDateRange = false;
                    }
                }

                // Deals filter (v5.0.0-alpha.163 - works for all books, not just wishlist)
                const matchesDeals = !dealsFilterActive ||
                    (book.priceTrigger != null && book.currentPrice != null && book.currentPrice <= book.priceTrigger);

                // Tag filter
                const matchesTags = !tagFilter || tagFilter.length === 0 ||
                    tagFilter.some(tag => book.tags?.includes(tag));

                // Series filter (v5.0.0-alpha.175.44 - Phase 5.5: Multi-select with NOT_IN_SERIES)
                let matchesSeriesMulti = true;
                if (selectedSeries.length > 0) {
                    const hasNotInSeries = selectedSeries.includes('NOT_IN_SERIES');
                    const otherSeries = selectedSeries.filter(s => s !== 'NOT_IN_SERIES');

                    const bookSeries = book.series || '';
                    const isInSeries = otherSeries.includes(bookSeries);
                    const isNotInSeries = !bookSeries || bookSeries.trim() === '';

                    matchesSeriesMulti = (hasNotInSeries && isNotInSeries) || isInSeries;
                }

                return matchesSearch && matchesReadStatus && matchesCollection && matchesCollections && matchesAmazonRating &&
                    matchesMyRating && matchesRating && matchesOwnership && matchesHidden && matchesSeries &&
                    matchesSeriesMulti && matchesDateRange && matchesDeals && matchesTags;
            };

            // Get folder by ID (handles All Books and My Library virtual folders)
            const getFolderById = (folderId) => {
                if (folderId === '__all__') return FOLDER_ALL_BOOKS;
                if (folderId === '__library__') return FOLDER_LIBRARY; // v5.0.0-alpha.63
                const folder = folders.find(f => f.id === folderId);
                if (folder?.id === '__inbox__') return { ...folder, ...FOLDER_INBOX };
                return folder;
            };

            // v5.0.0-alpha.80 - Get folder path (breadcrumb) from root to current folder
            const getFolderPath = (folderId) => {
                if (folderId === '__all__') return [FOLDER_ALL_BOOKS];
                if (folderId === '__library__') return [FOLDER_LIBRARY];

                const path = [];
                let current = getFolderById(folderId);
                while (current) {
                    path.unshift(current);
                    if (current.parentId === null || current.parentId === undefined) {
                        // At root level, prepend My Library
                        path.unshift(FOLDER_LIBRARY);
                        break;
                    }
                    current = getFolderById(current.parentId);
                }
                return path;
            };

            // v5.0.0-alpha.98 - Get all folders containing a book (for All Books tooltip)
            const getFoldersContainingBook = (bookId) => {
                return folders.filter(f => {
                    // Skip virtual folders
                    if (f.id === '__all__' || f.id === '__library__') return false;
                    // Check if folder's bookIds includes this book
                    return (f.bookIds || []).includes(bookId);
                });
            };

            // v5.0.0 - Toast notification helper (reusable for all feedback messages)
            // Shows toast at position, animates to footer, persists 10s, then fades
            const showToast = (message, x, y) => {
                setClipboardMessage(message);
                setToastPosition({ x, y });
                setFooterClipboardVisible(false);
                setToastVisible(true);
                setToastAnimating(false);
                setTimeout(() => {
                    setToastAnimating(true);
                    setTimeout(() => {
                        setToastVisible(false);
                        setToastAnimating(false);
                        setFooterClipboardVisible(true);
                        // Fade out footer after 10 seconds
                        setTimeout(() => {
                            setFooterClipboardVisible(false);
                        }, 10000);
                    }, 1000); // Animation duration
                }, 1500); // Wait before animating
            };

            // Get child folders of a parent (null = root level)
            // v5.0.0-alpha.66 - Respects custom order from parent's childFolderIds or sortIndex
            const getChildFolders = (parentId) => {
                const children = folders.filter(f => f.parentId === parentId);

                if (parentId === null) {
                    // Root level folders - use sortIndex property if available
                    const hasSortIndex = children.some(f => f.sortIndex !== undefined);
                    if (hasSortIndex) {
                        return [...children].sort((a, b) => {
                            const idxA = a.sortIndex ?? Infinity;
                            const idxB = b.sortIndex ?? Infinity;
                            if (idxA !== idxB) return idxA - idxB;
                            return a.name.localeCompare(b.name);
                        });
                    }
                } else {
                    // Nested folders - use parent's childFolderIds
                    const parentFolder = folders.find(f => f.id === parentId);
                    const customOrder = parentFolder?.childFolderIds || [];

                    if (customOrder.length > 0) {
                        const orderMap = new Map(customOrder.map((id, i) => [id, i]));
                        return [...children].sort((a, b) => {
                            const posA = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
                            const posB = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
                            if (posA !== posB) return posA - posB;
                            return a.name.localeCompare(b.name);
                        });
                    }
                }

                return children; // No custom order, return as-is (will be sorted alphabetically later)
            };

            // v5.0.0 - Get total book count for a folder including all subfolders recursively
            const getFolderTotalCount = (folderId) => {
                const folder = folders.find(f => f.id === folderId);
                if (!folder) return { direct: 0, subfolder: 0, total: 0 };

                const direct = (folder.bookIds || []).length;
                let subfolder = 0;

                const countChildren = (parentId) => {
                    const children = folders.filter(f => f.parentId === parentId);
                    children.forEach(child => {
                        subfolder += (child.bookIds || []).length;
                        countChildren(child.id); // Recurse
                    });
                };
                countChildren(folderId);

                return { direct, subfolder, total: direct + subfolder };
            };

            // v5.0.0-alpha.169 - Get filtered book count for a folder (matching/total) including subfolders
            // v5.0.0-alpha.169.3 - Also returns directMatching for "inside" badge display
            const getFilteredFolderCount = (folderId) => {
                const folder = folders.find(f => f.id === folderId);
                if (!folder) return { matching: 0, total: 0, directMatching: 0 };

                // Count direct books
                const directBooks = (folder.bookIds || [])
                    .map(id => books.find(b => b.id === id))
                    .filter(Boolean);
                const directMatching = directBooks.filter(filterBookForExplorer).length;
                const directTotal = directBooks.length;

                // Count books in subfolders (recursive)
                let subfolderMatching = 0;
                let subfolderTotal = 0;
                const countChildren = (parentId) => {
                    folders.filter(f => f.parentId === parentId).forEach(child => {
                        const childBooks = (child.bookIds || [])
                            .map(id => books.find(b => b.id === id))
                            .filter(Boolean);
                        subfolderMatching += childBooks.filter(filterBookForExplorer).length;
                        subfolderTotal += childBooks.length;
                        countChildren(child.id);
                    });
                };
                countChildren(folderId);

                return {
                    matching: directMatching + subfolderMatching,
                    total: directTotal + subfolderTotal,
                    directMatching: directMatching
                };
            };

            // Reorder a book within a folder's bookIds array
            // Reorder books within a folder (supports single or multiple books)
            // v5.0.0-alpha.46 - Added undo support
            const reorderBooksInFolder = (folderId, bookIdsToMove, targetIndex) => {
                // Capture fromIndices BEFORE modifying state (for undo)
                const currentFolder = folders.find(f => f.id === folderId);
                const currentBookIds = currentFolder?.bookIds || [];
                const fromIndices = bookIdsToMove.map(id => currentBookIds.indexOf(id));

                setFolders(prev => prev.map(folder => {
                    if (folder.id !== folderId) return folder;
                    const bookIds = [...(folder.bookIds || [])];
                    const moveSet = new Set(bookIdsToMove);

                    // Find the minimum current index of books being moved
                    const minCurrentIndex = Math.min(...bookIdsToMove.map(id => bookIds.indexOf(id)).filter(i => i >= 0));

                    // Remove all books being moved
                    const remaining = bookIds.filter(id => !moveSet.has(id));

                    // Adjust target index based on how many items were removed before it
                    const removedBefore = bookIds.slice(0, targetIndex).filter(id => moveSet.has(id)).length;
                    const adjustedIndex = targetIndex - removedBefore;

                    // Insert all books at target position (maintaining their relative order)
                    const orderedBooksToMove = bookIdsToMove.filter(id => bookIds.includes(id));
                    remaining.splice(adjustedIndex, 0, ...orderedBooksToMove);

                    return { ...folder, bookIds: remaining };
                }));

                // Record action for undo
                recordAction({
                    type: 'REORDER_BOOKS_FOLDER',
                    folderId: folderId,
                    bookIds: bookIdsToMove,
                    fromIndices: fromIndices,
                    toIndex: targetIndex
                });
                console.log(`🔄 Reordered ${bookIdsToMove.length} book(s) in folder`);
            };

            // v5.0.0-alpha.79 - Reorder folders within their parent (with undo)
            // Updates parent's childFolderIds array to persist custom order
            // v5.0.0-alpha.90 - Changed to use targetFolderId + position instead of index
            // This fixes off-by-one issues when display order differs from getChildFolders order
            const reorderFoldersInParent = (parentId, folderIdsToMove, targetFolderId, position) => {
                // Get current child folders in their current order
                const currentChildren = getChildFolders(parentId);
                const currentOrder = currentChildren.map(f => f.id);

                // Find target index based on folder ID (not visual index)
                let targetIndex = currentOrder.indexOf(targetFolderId);
                if (targetIndex === -1) return; // Target not found
                if (position === 'after') targetIndex++;

                // Capture fromIndices BEFORE modifying (for undo)
                const fromIndices = folderIdsToMove.map(id => currentOrder.indexOf(id));

                // Build new order
                const moveSet = new Set(folderIdsToMove);
                const remaining = currentOrder.filter(id => !moveSet.has(id));

                // Adjust target index based on how many items were removed before it
                const removedBefore = currentOrder.slice(0, targetIndex).filter(id => moveSet.has(id)).length;
                const adjustedIndex = targetIndex - removedBefore;

                // Insert at target position (maintaining relative order of moved items)
                const orderedToMove = folderIdsToMove.filter(id => currentOrder.includes(id));
                remaining.splice(adjustedIndex, 0, ...orderedToMove);

                // Update parent's childFolderIds (or create virtual parent tracking for root level)
                if (parentId) {
                    setFolders(prev => prev.map(folder => {
                        if (folder.id !== parentId) return folder;
                        return { ...folder, childFolderIds: remaining };
                    }));
                } else {
                    // Root level folders - store order in a special way
                    // For now, we'll store this in localStorage as root folder order
                    // Actually, we need to update each folder's parentId order somehow...
                    // Simpler: Add a "rootFolderOrder" to explorer state
                    // For now, let's update folders to include a sort index
                    setFolders(prev => {
                        const updated = [...prev];
                        remaining.forEach((folderId, idx) => {
                            const folderIdx = updated.findIndex(f => f.id === folderId);
                            if (folderIdx >= 0) {
                                updated[folderIdx] = { ...updated[folderIdx], sortIndex: idx };
                            }
                        });
                        return updated;
                    });
                }

                // Record for undo
                const folderNames = folderIdsToMove.map(id => folders.find(f => f.id === id)?.name || id).join(', ');
                recordAction({
                    type: 'REORDER_FOLDER',
                    parentId,
                    folderIds: folderIdsToMove,
                    fromIndices,
                    toIndex: adjustedIndex,
                    oldOrder: currentOrder,
                    newOrder: remaining,
                    description: `Reorder "${folderNames}"`
                });

                console.log(`🔄 Reordered ${folderIdsToMove.length} folder(s) in parent ${parentId || 'root'}`);
            };

            // v5.0.0-alpha.78 - Phase D: Reparent folder (move into another folder) with undo
            const reparentFolder = (folderIds, newParentId) => {
                // Helper: Check if targetId is a descendant of folderId
                const isDescendant = (folderId, targetId) => {
                    if (folderId === targetId) return true;
                    const children = folders.filter(f => f.parentId === folderId);
                    return children.some(child => isDescendant(child.id, targetId));
                };

                // Validate: can't move folder into itself or its descendants
                for (const folderId of folderIds) {
                    if (folderId === newParentId || isDescendant(folderId, newParentId)) {
                        showToast("Can't move folder into itself or its subfolder", 'error');
                        return false;
                    }
                    // Can't reparent Inbox
                    if (folderId === '__inbox__') {
                        showToast("Inbox cannot be moved", 'error');
                        return false;
                    }
                }

                // Can't move into Inbox
                if (newParentId === '__inbox__') {
                    showToast("Can't move folders into Inbox", 'error');
                    return false;
                }

                // Save old parentIds for undo
                const oldParentIds = folderIds.map(id => {
                    const folder = folders.find(f => f.id === id);
                    return { folderId: id, oldParentId: folder?.parentId };
                });

                setFolders(prev => prev.map(folder => {
                    if (folderIds.includes(folder.id)) {
                        return { ...folder, parentId: newParentId };
                    }
                    return folder;
                }));

                // Record for undo
                const folderNames = folderIds.map(id => folders.find(f => f.id === id)?.name || id).join(', ');
                const targetName = newParentId ? folders.find(f => f.id === newParentId)?.name : 'root';
                recordAction({
                    type: 'REPARENT_FOLDER',
                    folderIds,
                    oldParentIds,
                    newParentId,
                    description: `Move "${folderNames}" into "${targetName}"`
                });

                showToast(`Moved "${folderNames}" into "${targetName}"`, 'success');
                console.log(`📁 Moved ${folderIds.length} folder(s) into ${newParentId || 'root'}`);
                return true;
            };

            // v5.1.0 - Removed migrateColumnsToFolders() function (v4 Column App migration no longer needed)

            // v3.11.0.d - Ref for column menu click-outside detection
            const columnMenuRef = useRef(null);

            // v3.14.0.h - Track previous dropTarget for debug logging
            const prevDropTargetRef = useRef(null);

            // v3.14.0.w - Use refs instead of state for dropTarget to avoid React re-renders
            const dropTargetRef = useRef(null);
            const indicatorRef = useRef(null);

            // v3.14.0.x - Use refs for ghost position to eliminate ALL React re-renders during drag
            const dragGhostRef = useRef(null);
            const dragPosRef = useRef({ x: 0, y: 0 });

            // v4.16.0.au - Copy-drag tracking (Ctrl+Drag to copy instead of move)
            const isCopyDragRef = useRef(false);
            const dragTooltipRef = useRef(null);

            // v5.0.0-alpha.132 - Tooltip hide delay (prevents tooltip from disappearing when moving cursor to it)
            const tooltipHideTimeoutRef = useRef(null);

            // v3.14.0.r - Row-based grid index for O(log R) drop position lookup
            // Structure: { columnId: { rowBoundaries: [y1, y2, ...], rows: [{type, startIndex, items, top, bottom}, ...], columnRect } }
            const columnIndexRef = useRef({});

            // v4.0.1 - Ref to hold current filteredBooks function for Ctrl+A handler
            const filteredBooksRef = useRef(null);

            // v3.12.0 - Auto-scroll during drag
            const [autoScrollInterval, setAutoScrollInterval] = useState(null);

            // Status bar state (v3.9.0 - Load-state-only, 4 states)
            const [libraryStatus, setLibraryStatus] = useState({
                loadStatus: 'empty',     // empty, fresh, stale, obsolete
                loadDate: null           // ISO date string from loaded JSON metadata.fetchDate
            });
            const [collectionsStatus, setCollectionsStatus] = useState({
                loadStatus: 'empty',
                loadDate: null
            });

            // Wrapper for setSyncStatus
            const setSyncStatus = (newStatus) => {
                setSyncStatusInternal(newStatus);
            };
            // v5.0.0-alpha.175.48 - Removed settings state (dead code, cacheExpirationDays not used)
            const dragThreshold = 50;

            // v5.0.0-alpha.92 - Navigation history functions
            const navigateToFolder = (folderId, addToHistory = true) => {
                setSelectedFolderId(folderId);
                // v5.0.0-alpha.161 - Clear right panel selections when navigating
                setExplorerSelectedFolders(new Set());
                setExplorerSelectedBooks(new Set());
                if (addToHistory) {
                    // Truncate forward history and add new entry
                    setNavHistory(prev => [...prev.slice(0, navHistoryIndex + 1), folderId]);
                    setNavHistoryIndex(prev => prev + 1);
                }
            };

            const canGoBack = navHistoryIndex > 0;
            const canGoForward = navHistoryIndex < navHistory.length - 1;

            const goBack = () => {
                if (canGoBack) {
                    const newIndex = navHistoryIndex - 1;
                    setNavHistoryIndex(newIndex);
                    setSelectedFolderId(navHistory[newIndex]);
                    // v5.0.0-alpha.161 - Clear right panel selections when navigating
                    setExplorerSelectedFolders(new Set());
                    setExplorerSelectedBooks(new Set());
                }
            };

            const goForward = () => {
                if (canGoForward) {
                    const newIndex = navHistoryIndex + 1;
                    setNavHistoryIndex(newIndex);
                    setSelectedFolderId(navHistory[newIndex]);
                    // v5.0.0-alpha.161 - Clear right panel selections when navigating
                    setExplorerSelectedFolders(new Set());
                    setExplorerSelectedBooks(new Set());
                }
            };

            // v4.15.6: Track initial mount to prevent save effect from overwriting loaded values
            const filtersLoadedRef = useRef(false);
            const explorerSettingsLoadedRef = useRef(false); // v5.0.0-alpha.169.10 - Track Explorer settings load

            // v5.0.0-alpha.82 - Timeout for auto-expanding folder on drag hover
            const dragHoverExpandTimeoutRef = useRef(null);

            // Load saved filters from localStorage on mount (v3.8.0.f, updated v3.8.0.k, v4.15.6)
            React.useEffect(() => {
                try {
                    const savedFilters = localStorage.getItem(FILTERS_KEY);
                    if (savedFilters) {
                        const filters = JSON.parse(savedFilters);
                        if (filters.searchTerm !== undefined) setSearchTerm(filters.searchTerm);
                        if (filters.readStatusFilter !== undefined) setReadStatusFilter(filters.readStatusFilter);
                        if (filters.collectionFilter !== undefined) setCollectionFilter(filters.collectionFilter);
                        if (filters.ratingFilter !== undefined) setRatingFilter(filters.ratingFilter);
                        if (filters.ownershipFilter !== undefined) setOwnershipFilter(filters.ownershipFilter);
                        if (filters.seriesFilter !== undefined) setSeriesFilter(filters.seriesFilter);
                        if (filters.showHidden !== undefined) setShowHidden(filters.showHidden);

                        // v4.15.6: Load datePreset, with migration from old dateFrom/dateTo format
                        if (filters.datePreset) {
                            // New format: datePreset controls the filter
                            setDatePreset(filters.datePreset);
                            if (filters.datePreset === 'custom') {
                                // Custom preset: also restore the manual dates
                                if (filters.dateFrom) setDateFrom(filters.dateFrom);
                                if (filters.dateTo) setDateTo(filters.dateTo);
                            }
                            // For non-custom presets, the useEffect will compute dateFrom/dateTo
                        } else if (filters.dateFrom || filters.dateTo) {
                            // Migration: old format had dateFrom/dateTo but no datePreset
                            // Treat as custom date range
                            setDatePreset('custom');
                            if (filters.dateFrom) setDateFrom(filters.dateFrom);
                            if (filters.dateTo) setDateTo(filters.dateTo);
                        }
                        // v4.27.0: Load tag filter
                        if (filters.tagFilter && Array.isArray(filters.tagFilter)) {
                            setTagFilter(filters.tagFilter);
                        }
                        // v5.0.0-alpha.175.41: Load Collections filter
                        if (filters.selectedCollections && Array.isArray(filters.selectedCollections)) {
                            setSelectedCollections(filters.selectedCollections);
                        }
                        // v5.0.0-alpha.175.42: Load Amazon Rating filter
                        if (filters.minAmazonRating) {
                            setMinAmazonRating(filters.minAmazonRating);
                        }
                        // v5.0.0-alpha.175.43: Load My Rating filter
                        if (filters.minMyRating) {
                            setMinMyRating(filters.minMyRating);
                        }
                        // v5.0.0-alpha.175.44: Load Series filter
                        if (filters.selectedSeries && Array.isArray(filters.selectedSeries)) {
                            setSelectedSeries(filters.selectedSeries);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load filters from localStorage:', e);
                }
                // v4.15.6: Mark filters as loaded after a small delay to let React batch state updates
                setTimeout(() => {
                    filtersLoadedRef.current = true;
                }, 100);
            }, []); // Empty dependency array = run once on mount

            // Save filters to localStorage whenever they change (v3.8.0.f, updated v3.8.0.k, v4.1.0.d, v4.15.6)
            React.useEffect(() => {
                // v4.15.6: Skip save during initial load to prevent overwriting
                if (!filtersLoadedRef.current) return;
                try {
                    const filters = {
                        searchTerm,
                        readStatusFilter,
                        collectionFilter,
                        ratingFilter,
                        ownershipFilter,
                        seriesFilter,
                        datePreset,  // v4.15.6: Save preset instead of raw dates (except for custom)
                        dateFrom: datePreset === 'custom' ? dateFrom : '',  // Only save dates for custom preset
                        dateTo: datePreset === 'custom' ? dateTo : '',
                        showHidden,
                        tagFilter,  // v4.27.0 - Tag filter
                        selectedCollections,  // v5.0.0-alpha.175.41 - Collections filter
                        minAmazonRating,  // v5.0.0-alpha.175.42 - Amazon Rating filter
                        minMyRating,  // v5.0.0-alpha.175.43 - My Rating filter
                        selectedSeries  // v5.0.0-alpha.175.44 - Series filter
                    };
                    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
                } catch (e) {
                    console.error('Failed to save filters to localStorage:', e);
                }
            }, [searchTerm, readStatusFilter, collectionFilter, ratingFilter, ownershipFilter, seriesFilter, datePreset, dateFrom, dateTo, showHidden, tagFilter, selectedCollections, minAmazonRating, minMyRating, selectedSeries]);

            // Compute dateFrom/dateTo from datePreset selection (v4.15.6)
            React.useEffect(() => {
                // Skip during initial load - the load effect will set dateFrom/dateTo directly
                if (!filtersLoadedRef.current) return;
                if (!datePreset || datePreset === 'custom') {
                    // 'custom' uses manual dateFrom/dateTo, don't override
                    // '' (All Dates) clears the date filter
                    if (datePreset === '') {
                        setDateFrom('');
                        setDateTo('');
                    }
                    return;
                }

                const today = new Date();
                const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

                let from = '';
                let to = formatDate(today);

                if (datePreset === 'last30') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 30);
                    from = formatDate(d);
                } else if (datePreset === 'last90') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 90);
                    from = formatDate(d);
                } else if (datePreset === 'lastYear') {
                    const d = new Date(today);
                    d.setFullYear(d.getFullYear() - 1);
                    from = formatDate(d);
                } else if (datePreset.startsWith('year')) {
                    // Year preset: yearYYYY format
                    const year = parseInt(datePreset.substring(4));
                    from = `${year}-01-01`;
                    to = `${year}-12-31`;
                }

                setDateFrom(from);
                setDateTo(to);
            }, [datePreset]);

            // v5.0.0-alpha.169.5 - Unified date parsing for sorting
            // Handles both numeric timestamps and string dates (e.g., "January 15, 2024")
            const parseBookDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                // Try as numeric timestamp first
                const ts = typeof dateStr === 'string' ? parseInt(dateStr) : dateStr;
                if (!isNaN(ts) && ts > 1000000000) {
                    return new Date(ts > 9999999999 ? ts : ts * 1000);
                }
                // Try as date string (handles "January 15, 2024", "2024-01-15", etc.)
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? new Date(0) : d;
            };

            // v5.0.0-alpha.169.5 - Unified date formatting for display
            // Uses parseBookDate to handle any format, returns consistent display
            const formatAcquisitionDate = (dateStr) => {
                if (!dateStr) return '';
                const d = parseBookDate(dateStr);
                if (d.getTime() === 0) return String(dateStr); // Fallback to raw value if unparseable
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            };

            const getRelativeTime = (timestamp) => {
                if (!timestamp) return '';
                const now = Date.now();
                const diff = now - timestamp;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);

                if (minutes < 1) return 'just now';
                if (minutes < 60) return `${minutes}m ago`;
                if (hours < 24) return `${hours}h ago`;
                return `${days}d ago`;
            };

            // checkManifest function removed in v3.6.1 - replaced with IndexedDB manifests
            // Status is now computed from libraryStatus and collectionsStatus state

            // Initial load from IndexedDB
            useEffect(() => {
                const loadData = async () => {
                    try {
                        // v5.0.0-alpha.175.49.1 - Removed settings load (dead code, settings state removed in v175.48)

                        // Restore libraryStatus and collectionsStatus from localStorage (v3.7.0.n)
                        const savedStatus = localStorage.getItem(STATUS_KEY);
                        if (savedStatus) {
                            const statusData = JSON.parse(savedStatus);
                            if (statusData.libraryStatus) {
                                setLibraryStatus(statusData.libraryStatus);
                                console.log('📦 Restored libraryStatus from localStorage:', statusData.libraryStatus.loadStatus);
                            }
                            if (statusData.collectionsStatus) {
                                setCollectionsStatus(statusData.collectionsStatus);
                                console.log('📦 Restored collectionsStatus from localStorage:', statusData.collectionsStatus.loadStatus);
                            }
                        }

                        // v5.0.0 - Load Explorer settings
                        const savedExplorer = localStorage.getItem(EXPLORER_KEY);
                        if (savedExplorer) {
                            const explorerData = JSON.parse(savedExplorer);
                            // v5.0.2 - viewMode removed (always Explorer mode)
                            if (explorerData.selectedFolderId) setSelectedFolderId(explorerData.selectedFolderId);
                            if (explorerData.explorerView) setExplorerView(explorerData.explorerView);
                            // v5.0.0-alpha.169.11 - Use per-folder sort if available, else fall back to explorerSort
                            // v5.0.0-alpha.174 - Migrate legacy single-object format to array
                            const folderId = explorerData.selectedFolderId || '__all__';
                            const perFolderSort = explorerData.folderSortSettings?.[folderId];
                            if (perFolderSort) {
                                // Migrate to array if needed
                                const sortArray = Array.isArray(perFolderSort) ? perFolderSort : [perFolderSort];
                                setExplorerSort(sortArray);
                            } else if (explorerData.explorerSort) {
                                // Migrate to array if needed
                                const sortArray = Array.isArray(explorerData.explorerSort) ? explorerData.explorerSort : [explorerData.explorerSort];
                                setExplorerSort(sortArray);
                            }
                            if (explorerData.explorerCoverCols) setExplorerCoverCols(explorerData.explorerCoverCols);
                            if (explorerData.leftPaneWidth) setLeftPaneWidth(explorerData.leftPaneWidth); // v5.0.0-alpha.91
                            if (explorerData.folderSortSettings) setFolderSortSettings(explorerData.folderSortSettings); // v5.0.0-alpha.100
                            if (explorerData.visibleColumns) setVisibleColumns(explorerData.visibleColumns); // v5.0.0-alpha.104
                            // v5.0.0-alpha.109 - Restore column widths, filtering out null values
                            // v5.0.3-alpha.1 - Merge localStorage with defaults (handles new columns)
                            if (explorerData.columnWidths) {
                                const defaultWidths = {
                                    title: 200, author: 150, series: 150, seriesNum: 50, rating: 96,
                                    myRating: 100, dateAdded: 112, price: 80, priceGoal: 80, delta: 80, amazon: 70
                                };
                                // Iterate over defaults, overlay localStorage values, filter nulls
                                const sanitizedWidths = Object.fromEntries(
                                    Object.keys(defaultWidths).map(key => [
                                        key,
                                        explorerData.columnWidths[key] ?? defaultWidths[key]
                                    ])
                                );
                                setColumnWidths(sanitizedWidths);
                            }
                            if (explorerData.columnOrder) setColumnOrder(explorerData.columnOrder); // v5.0.0-alpha.172
                            console.log('📁 Restored Explorer settings from localStorage');
                        }
                        // v5.0.0-alpha.169.10 - Mark settings loaded (even if no saved data)
                        explorerSettingsLoadedRef.current = true;

                        // v5.0.0 - Load folders
                        const savedFolders = localStorage.getItem(FOLDERS_KEY);
                        let loadedFolders = savedFolders ? JSON.parse(savedFolders) : [];

                        // Load books from IndexedDB
                        let loadedBooks = await loadBooksFromIndexedDB();

                        // Merge collections data into loaded books
                        if (loadedBooks.length > 0) {
                            loadedBooks = await mergeCollectionsIntoBooks(loadedBooks);

                            // v5.1.0-alpha.8 - Clean up orphaned bookIds in folders
                            if (loadedFolders.length > 0) {
                                const validBookIds = new Set(loadedBooks.map(b => b.id));
                                let totalOrphans = 0;

                                loadedFolders = loadedFolders.map(folder => {
                                    if (folder.bookIds && folder.bookIds.length > 0) {
                                        const before = folder.bookIds.length;
                                        folder.bookIds = folder.bookIds.filter(id => validBookIds.has(id));
                                        const removed = before - folder.bookIds.length;
                                        if (removed > 0) {
                                            console.log(`[CLEANUP] Removed ${removed} orphaned bookIds from folder "${folder.name}"`);
                                            totalOrphans += removed;
                                        }
                                    }
                                    return folder;
                                });

                                if (totalOrphans > 0) {
                                    console.log(`[CLEANUP] Total orphaned bookIds removed: ${totalOrphans}`);
                                    localStorage.setItem(FOLDERS_KEY, JSON.stringify(loadedFolders));
                                }
                            }

                            setFolders(loadedFolders);
                            setBooks(loadedBooks);
                            // Update IndexedDB with merged data
                            await saveBooksToIndexedDB(loadedBooks);

                            // v4.13.0: Initialize cover cache
                            // Build URL map from cache for immediate use
                            const urlMap = await buildCoverUrlMap(loadedBooks);
                            setCoverUrlMap(urlMap);
                            // Populate cache in background for uncached images
                            populateCoverCache(loadedBooks); // Don't await - runs in background
                        }

                        let effectiveLastSync = null;

                        if (loadedBooks.length > 0) {

                            // Load organization from localStorage
                            const saved = localStorage.getItem(STORAGE_KEY);
                            if (saved) {
                                const state = JSON.parse(saved);
                                if (state.organization?.columns) {
                                    const restoredColumns = state.organization.columns.map(col => ({
                                        id: col.id,
                                        name: col.name,
                                        books: col.bookIds || col.books
                                    }));
                                    setColumns(restoredColumns);
                                    setBlankImageBooks(new Set(state.organization.blankImageBooks || []));
                                    setHiddenInstances(new Set(state.organization.hiddenInstances || [])); // v4.16.0.z
                                    setTagRegistry(state.organization.tagRegistry || {}); // v4.27.0
                                    setFolders(state.organization.folders || []); // v5.0.0
                                    setDataSource(state.organization.dataSource || 'enriched');
                                    effectiveLastSync = state.lastSyncTime || Date.now();
                                    setLastSyncTime(effectiveLastSync);
                                    console.log('✅ Restored organization from localStorage');
                                } else {
                                    // No organization saved, put all books in first column
                                    setColumns([{ id: 'unorganized', name: 'Unorganized', books: loadedBooks.map(b => b.id) }]);
                                    setDataSource('enriched');
                                    effectiveLastSync = Date.now();
                                    setLastSyncTime(effectiveLastSync);
                                }
                            } else {
                                // No saved state, put all books in first column
                                setColumns([{ id: 'unorganized', name: 'Unorganized', books: loadedBooks.map(b => b.id) }]);
                                setDataSource('enriched');
                                effectiveLastSync = Date.now();
                                setLastSyncTime(effectiveLastSync);
                            }
                        }


                        // Loading complete - set syncStatus to indicate we're done loading
                        // Actual status display now comes from libraryStatus/collectionsStatus
                        setSyncStatus('none');
                    } catch (error) {
                        console.error('Failed to load data:', error);
                        setSyncStatus('none');
                    }
                };

                loadData();
            }, []);

            // v5.1.0 - Removed migration detection useEffect (v4 Column App migration no longer needed)

            // v5.0.0-alpha.132 - Cleanup tooltip timeout on unmount
            useEffect(() => {
                return () => {
                    if (tooltipHideTimeoutRef.current) {
                        clearTimeout(tooltipHideTimeoutRef.current);
                    }
                };
            }, []);

            // Auto-save organization
            // v4.16.0.ab - Guard: Skip save while loading to prevent race condition
            useEffect(() => {
                if (syncStatus === 'loading') return;
                if (books.length > 0 && columns.length > 0) {
                    try {
                        const state = {
                            organization: {
                                columns: columns.map(col => ({
                                    id: col.id,
                                    name: col.name,
                                    bookIds: col.books
                                })),
                                folders,  // v5.0.0 - Book Explorer folders
                                dataSource,
                                blankImageBooks: Array.from(blankImageBooks),
                                hiddenInstances: Array.from(hiddenInstances), // v4.16.0.z
                                tagRegistry  // v4.27.0 - Tag registry
                            },
                            lastSyncTime: lastSyncTime || Date.now(),
                            savedAt: Date.now()
                        };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                    } catch (e) {
                        console.warn('Could not auto-save organization:', e);
                    }
                }
            }, [syncStatus, columns, folders, blankImageBooks, dataSource, lastSyncTime, hiddenInstances, tagRegistry]);

            // v5.1.0-alpha.7 - Helper: Get all books in folder (including subfolders recursively)
            const getAllBooksInFolder = (folderId, folders) => {
                const folder = folders.find(f => f.id === folderId);
                if (!folder) return [];

                // Collect books directly in this folder
                const bookIds = new Set(folder.bookIds || []);

                // Recursively collect books from all child folders
                const childFolders = folders.filter(f => f.parentId === folderId);
                childFolders.forEach(child => {
                    const childBookIds = getAllBooksInFolder(child.id, folders);
                    childBookIds.forEach(id => bookIds.add(id));
                });

                return Array.from(bookIds);
            };

            // v5.1.0-alpha.10 - Debounce slider updates to avoid expensive recalculations
            useEffect(() => {
                const timer = setTimeout(() => {
                    setWizardMinBooks(wizardMinBooksSlider);
                }, 300); // 300ms debounce delay
                return () => clearTimeout(timer);
            }, [wizardMinBooksSlider]);

            // v5.1.0-alpha.4 - Wizard: Detect authors when modal opens or settings change
            useEffect(() => {
                if (!wizardModalOpen) return; // Only run when modal is open

                console.log('[WIZARD] Detecting authors from Inbox...');
                console.log('[WIZARD] Minimum books:', wizardMinBooks);

                // Helper: Normalize author name for grouping (case-insensitive comparison)
                const normalizeAuthor = (author) => {
                    if (!author) return 'Unknown Author';
                    return author.trim().toLowerCase();
                };

                // Helper: Format author name for display (use Amazon format as-is)
                const formatAuthor = (author) => {
                    if (!author) return 'Unknown Author';
                    return author.trim();
                };

                // v5.1.0-alpha.10 - Source is always Inbox (books not in any user folder)
                const booksInFolders = new Set();
                folders.forEach(folder => {
                    // Only count books in actual user folders, not virtual folders
                    if (folder.id !== '__inbox__' && folder.id !== '__all__') {
                        (folder.bookIds || []).forEach(bookId => booksInFolders.add(bookId));
                    }
                });
                const sourceBooks = books.filter(book => !booksInFolders.has(book.id));

                console.log('[WIZARD] Total books:', books.length);
                console.log('[WIZARD] Books in user folders:', booksInFolders.size);
                console.log('[WIZARD] Books in Inbox:', sourceBooks.length);

                // Group books by normalized author
                const authorMap = new Map();
                sourceBooks.forEach(book => {
                    const normalizedAuthor = normalizeAuthor(book.author);

                    if (!authorMap.has(normalizedAuthor)) {
                        authorMap.set(normalizedAuthor, {
                            normalizedName: normalizedAuthor,
                            originalName: book.author || 'Unknown Author',
                            books: [],
                            seriesSet: new Set()
                        });
                    }

                    const authorData = authorMap.get(normalizedAuthor);
                    authorData.books.push(book);

                    // Track series
                    if (book.series) {
                        authorData.seriesSet.add(book.series);
                    }
                });

                // Convert to array and calculate counts
                const authorsArray = Array.from(authorMap.values()).map(authorData => ({
                    normalizedName: authorData.normalizedName,
                    displayName: formatAuthor(authorData.originalName),
                    originalName: authorData.originalName,
                    books: authorData.books,
                    bookCount: authorData.books.length,
                    seriesCount: authorData.seriesSet.size
                }));

                // Filter by minimum books threshold
                const filtered = authorsArray.filter(author => author.bookCount >= wizardMinBooks);

                // v5.1.0-alpha.10 - Sort by user preference (book count or author name)
                const sorted = filtered.sort((a, b) => {
                    if (wizardSortBy === 'authorName') {
                        return a.displayName.localeCompare(b.displayName);
                    } else {
                        return b.bookCount - a.bookCount;
                    }
                });

                console.log('[WIZARD] Authors detected:', sorted.length);
                console.log('[WIZARD] Sort by:', wizardSortBy);
                console.log('[WIZARD] Top 5 authors:', sorted.slice(0, 5).map(a => `${a.displayName} (${a.bookCount} books, ${a.seriesCount} series)`));

                setWizardAuthors(sorted);

                // Auto-select all authors by default
                const allAuthorNames = new Set(sorted.map(a => a.normalizedName));
                setWizardSelectedAuthors(allAuthorNames);
            }, [wizardModalOpen, wizardMinBooks, wizardSortBy, books, folders]);

            // v5.0.0-alpha.175.28 - Expose state for console debugging
            useEffect(() => {
                window.DEBUG = {
                    tagRegistry,
                    books,
                    columns,
                    folders
                };
            }, [tagRegistry, books, columns, folders]);

            // v5.0.0 - Sync Inbox folder: add books not in ANY folder to Inbox
            // Note: Only adds, doesn't remove (removal happens via move drop handler)
            useEffect(() => {
                if (syncStatus === 'loading' || books.length === 0) return;

                const inbox = getInboxFolder();
                // Get all book IDs in ANY folder (including Inbox)
                const booksInAnyFolder = new Set();
                folders.forEach(folder => {
                    (folder.bookIds || []).forEach(id => booksInAnyFolder.add(id));
                });
                const booksNotInAnyFolder = books.map(b => b.id).filter(id => !booksInAnyFolder.has(id));

                if (!inbox) {
                    // Create Inbox with all books not in any folder (newest first)
                    console.log('📥 Creating Inbox folder with', booksNotInAnyFolder.length, 'books');
                    setFolders(prev => [{
                        id: '__inbox__',
                        name: 'Inbox',
                        parentId: null,
                        bookIds: [...booksNotInAnyFolder].reverse(),
                        childFolderIds: [],
                        collapsed: false,
                        isInbox: true
                    }, ...prev]);
                } else if (booksNotInAnyFolder.length > 0) {
                    // Add new books to Inbox (books imported that aren't in any folder yet)
                    console.log('📥 Adding', booksNotInAnyFolder.length, 'new books to Inbox');
                    setFolders(prev => prev.map(f => {
                        if (f.id !== '__inbox__') return f;
                        return { ...f, bookIds: [...booksNotInAnyFolder.reverse(), ...(f.bookIds || [])] };
                    }));
                }
            }, [books, folders, syncStatus]);

            // v5.0.0-alpha.175.49.1 - Removed settings save useEffect (dead code, settings state removed in v175.48)

            // Save libraryStatus and collectionsStatus to localStorage (v3.7.0.n)
            useEffect(() => {
                const statusData = { libraryStatus, collectionsStatus };
                localStorage.setItem(STATUS_KEY, JSON.stringify(statusData));
            }, [libraryStatus, collectionsStatus]);

            // v5.0.0 - Save Explorer settings to localStorage
            useEffect(() => {
                // v5.0.3-alpha.1 - Filter out null column widths before saving
                const defaultWidths = {
                    title: 200, author: 150, series: 150, seriesNum: 50, rating: 96,
                    myRating: 100, dateAdded: 112, price: 80, priceGoal: 80, delta: 80, amazon: 70
                };
                const sanitizedColumnWidths = Object.fromEntries(
                    Object.keys(defaultWidths).map(key => [
                        key,
                        columnWidths[key] ?? defaultWidths[key]
                    ])
                );

                const explorerData = {
                    // v5.0.2 - viewMode removed (always Explorer mode)
                    selectedFolderId,
                    explorerView,
                    explorerSort,
                    explorerCoverCols,
                    leftPaneWidth, // v5.0.0-alpha.91
                    folderSortSettings, // v5.0.0-alpha.100 - Per-folder sort settings
                    visibleColumns, // v5.0.0-alpha.104 - Column visibility
                    columnWidths: sanitizedColumnWidths, // v5.0.0-alpha.109 - Column widths (sanitized)
                    columnOrder // v5.0.0-alpha.172 - Column display order
                };
                localStorage.setItem(EXPLORER_KEY, JSON.stringify(explorerData));
            }, [selectedFolderId, explorerView, explorerSort, explorerCoverCols, leftPaneWidth, folderSortSettings, visibleColumns, columnWidths, columnOrder]);

            // v5.0.0 - Save folders to localStorage
            useEffect(() => {
                localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
            }, [folders]);

            // v5.0.0-alpha.175.2 - Close menus on outside click, close dialogs on ESC
            // v5.0.0-alpha.175.4 - Extended to close filter dropdowns
            // v5.0.0-alpha.175.40 - Extended to close More panel
            useEffect(() => {
                const handleClickOutside = (e) => {
                    // Close menus if clicking outside (not on menu button or dropdown)
                    if (openMenuBar && !e.target.closest('[data-menu-area]')) {
                        setOpenMenuBar(null);
                    }
                    // Close filter dropdowns if clicking outside
                    if (statusDropdownOpen && !e.target.closest('[data-status-dropdown]')) {
                        setStatusDropdownOpen(false);
                    }
                    if (tagsDropdownOpen && !e.target.closest('[data-tags-dropdown]')) {
                        setTagsDropdownOpen(false);
                    }
                    if (typesDropdownOpen && !e.target.closest('[data-types-dropdown]')) {
                        setTypesDropdownOpen(false);
                    }
                    // Close More panel if clicking outside (v5.0.0-alpha.175.47.2 - Fixed to close when clicking Tier 1 filters)
                    if (morePanelOpen && !e.target.closest('[data-morepanel]')) {
                        setMorePanelOpen(false);
                    }
                    // v5.0.0-alpha.175.41 - Phase 5.2: Close Collections dropdown
                    if (collectionsDropdownOpen && !e.target.closest('[data-collections-dropdown]')) {
                        setCollectionsDropdownOpen(false);
                    }
                    // v5.0.0-alpha.175.42 - Phase 5.3: Close Amazon Rating dropdown
                    if (amazonRatingDropdownOpen && !e.target.closest('[data-amazon-rating-dropdown]')) {
                        setAmazonRatingDropdownOpen(false);
                    }
                    // v5.0.0-alpha.175.43 - Phase 5.4: Close My Rating dropdown
                    if (myRatingDropdownOpen && !e.target.closest('[data-my-rating-dropdown]')) {
                        setMyRatingDropdownOpen(false);
                    }
                    // v5.0.0-alpha.175.44 - Phase 5.5: Close Series dropdown
                    if (seriesDropdownOpen && !e.target.closest('[data-series-dropdown]')) {
                        setSeriesDropdownOpen(false);
                    }
                    // v5.0.0-alpha.175.45 - Phase 5.6: Close Date dropdown
                    if (dateDropdownOpen && !e.target.closest('[data-date-dropdown]')) {
                        setDateDropdownOpen(false);
                    }
                };

                const handleEscKey = (e) => {
                    if (e.key === 'Escape') {
                        setOpenMenuBar(null);
                        setAboutDialogOpen(false);
                        setShortcutsDialogOpen(false);
                        setHowToDialogOpen(false);
                        setStatusDropdownOpen(false);
                        setTagsDropdownOpen(false);
                        setTypesDropdownOpen(false);
                        setMorePanelOpen(false);
                        setCollectionsDropdownOpen(false);
                        setAmazonRatingDropdownOpen(false); // v5.0.0-alpha.175.42 - Phase 5.3: Close Amazon Rating dropdown
                        setMyRatingDropdownOpen(false); // v5.0.0-alpha.175.43 - Phase 5.4: Close My Rating dropdown
                        setSeriesDropdownOpen(false); // v5.0.0-alpha.175.44 - Phase 5.5: Close Series dropdown
                        setDateDropdownOpen(false); // v5.0.0-alpha.175.45 - Phase 5.6: Close Date dropdown
                    }
                };

                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('keydown', handleEscKey);

                return () => {
                    document.removeEventListener('mousedown', handleClickOutside);
                    document.removeEventListener('keydown', handleEscKey);
                };
            }, [openMenuBar, statusDropdownOpen, tagsDropdownOpen, typesDropdownOpen, morePanelOpen, collectionsDropdownOpen]);

            // v5.0.0-alpha.100 - Restore per-folder sort when folder changes
            useEffect(() => {
                // v5.0.0-alpha.169.12 - Skip if folderSortSettings is still empty (initial state)
                // State updates are async, so effect may run before setFolderSortSettings propagates
                if (Object.keys(folderSortSettings).length === 0) {
                    return;
                }

                // Check if we have saved sort for this folder
                const savedSort = folderSortSettings[selectedFolderId];

                if (savedSort) {
                    // Restore saved sort for this folder
                    // v5.0.0-alpha.174 - Migrate to array if needed
                    const sortArray = Array.isArray(savedSort) ? savedSort : [savedSort];
                    setExplorerSort(sortArray);
                } else if (explorerSettingsLoadedRef.current) {
                    // v5.0.0-alpha.169.10 - Only apply defaults AFTER initial load completes
                    // No saved sort - use sensible defaults
                    if (selectedFolderId === '__all__') {
                        setExplorerSort([{ column: 'dateAdded', direction: 'desc' }]);
                    } else if (selectedFolderId === '__library__') {
                        setExplorerSort([{ column: 'title', direction: 'asc' }]);
                    } else {
                        setExplorerSort([{ column: 'custom', direction: 'asc' }]);
                    }
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [selectedFolderId]); // Only re-run when folder changes, not when settings change

            // v5.0.0-alpha.100 - Save sort settings for current folder when sort changes
            // v5.0.0-alpha.174 - Save array format
            useEffect(() => {
                // v5.0.0-alpha.169.10 - Skip save during initial load to prevent overwriting saved settings
                if (!explorerSettingsLoadedRef.current) return;

                // Only save if sort is different from what's saved for this folder
                const savedSort = folderSortSettings[selectedFolderId];
                const sortChanged = !savedSort || JSON.stringify(savedSort) !== JSON.stringify(explorerSort);

                if (sortChanged) {
                    setFolderSortSettings(prev => ({
                        ...prev,
                        [selectedFolderId]: explorerSort
                    }));
                }
            }, [explorerSort, selectedFolderId, folderSortSettings]);

            // v5.0.0-alpha.104 - Close Explorer column menu when clicking outside
            useEffect(() => {
                if (!explorerColumnMenuOpen) return;

                const handleClickOutside = (e) => {
                    // Close menu if clicking outside (not on the gear button or menu)
                    if (!e.target.closest('.column-chooser-menu') && !e.target.closest('.column-chooser-button')) {
                        setExplorerColumnMenuOpen(false);
                        setExplorerColumnMenuPos(null); // v5.0.0-alpha.107 - Clear context menu position
                    }
                };

                document.addEventListener('mousedown', handleClickOutside);
                return () => document.removeEventListener('mousedown', handleClickOutside);
            }, [explorerColumnMenuOpen]);

            // v5.0.0-alpha.82 - Auto-expand tree to show selected folder
            useEffect(() => {
                // Skip virtual folders (All Books, My Library)
                if (!selectedFolderId || selectedFolderId === '__all__' || selectedFolderId === '__library__') return;

                // Get path from root to selected folder
                const path = getFolderPath(selectedFolderId);
                // Extract ancestor IDs (skip virtual root and current folder - only expand parents)
                const ancestorIds = path
                    .filter(f => f.id !== '__library__' && f.id !== selectedFolderId)
                    .map(f => f.id);

                if (ancestorIds.length > 0) {
                    setFolders(prev => prev.map(f =>
                        ancestorIds.includes(f.id) ? { ...f, collapsed: false } : f
                    ));
                }
            }, [selectedFolderId]);

            // Expose books to window for debugging
            useEffect(() => {
                window.books = books;
            }, [books]);

            // Expose folders to window for debugging
            useEffect(() => {
                window.folders = folders;
                window.setFolders = setFolders;
            }, [folders]);

            // ESC key to clear selection, Ctrl+A to select all in active column
            useEffect(() => {
                const handleKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        clearSelection();
                        setContextMenu(null);
                        // v4.16.0 - Also clear clipboard on Escape
                        setClipboard(null);
                        // v4.16.0.g - Clear clipboard message on Escape
                        setClipboardMessage(null);
                        // v4.16.0.l - Clear toast state on Escape
                        setToastVisible(false);
                        setToastAnimating(false);
                        // v4.16.0.o - Clear footer clipboard visibility
                        setFooterClipboardVisible(false);
                    }

                    // v4.21.1.a - Let browser handle Ctrl+A/C/X natively when input/textarea focused
                    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
                    if (isInputFocused && (e.ctrlKey || e.metaKey) && ['a', 'c', 'x'].includes(e.key)) {
                        return; // Don't preventDefault, let browser handle
                    }

                    // v4.21.1.b - Let browser handle Ctrl+C if text is selected (user wants to copy text, not books)
                    const hasTextSelection = window.getSelection()?.toString().length > 0;
                    if (hasTextSelection && (e.ctrlKey || e.metaKey) && e.key === 'c') {
                        return; // Let browser copy selected text
                    }

                    // v4.21.1.c - Disable Ctrl+A when modal is open (prevent selecting entire page)
                    if (modalBookRef.current && (e.ctrlKey || e.metaKey) && e.key === 'a') {
                        e.preventDefault(); // Don't select entire page or books
                        return;
                    }

                    // v5.0.0-alpha.92 - Alt+Left: Back, Alt+Right: Forward
                    if (e.altKey && e.key === 'ArrowLeft') {
                        e.preventDefault();
                        goBack();
                    }
                    if (e.altKey && e.key === 'ArrowRight') {
                        e.preventDefault();
                        goForward();
                    }

                    // v4.8.0 - Ctrl+Z: Undo (v4.21.0.g - use ref to check modal state, consume keystroke)
                    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        if (!modalBookRef.current) undo();
                    }
                    // v4.8.0 - Ctrl+Y or Ctrl+Shift+Z: Redo (v4.21.0.g - use ref to check modal state, consume keystroke)
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                        e.preventDefault();
                        if (!modalBookRef.current) redo();
                    }

                    // Ctrl+A: Select all items in active column (v4.0.1 - use ref to get current filtered view)
                    // v4.19.1 - Now includes dividers in selection
                    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeColumnId) {
                        e.preventDefault(); // Prevent browser's select-all
                        const column = columns.find(col => col.id === activeColumnId);
                        if (column) {
                            // Select ALL items including dividers (use raw column.books for simplicity)
                            const compositeKeys = [];
                            let firstDividerId = null;
                            column.books.forEach((item, index) => {
                                if (!item) return;
                                if (typeof item === 'object' && item.type === 'divider') {
                                    // Divider: use special key format
                                    compositeKeys.push(`${activeColumnId}:divider:${item.id}:${index}`);
                                    if (!firstDividerId) firstDividerId = item.id;
                                } else {
                                    // Book: use standard composite key
                                    const bookId = getBookIdFromEntry(item);
                                    if (bookId) compositeKeys.push(`${activeColumnId}:${bookId}:${index}`);
                                }
                            });
                            setSelectedBooks(new Set(compositeKeys));
                            // Set selectedDivider for visual consistency if any dividers selected
                            if (firstDividerId) {
                                setSelectedDivider({ columnId: activeColumnId, dividerId: firstDividerId });
                            }
                        }
                    }

                    // v5.0.0-alpha.102 - Ctrl+A in Explorer view: Select all visible books/folders
                    // v5.0.0-alpha.103 - Fixed: Check viewMode first (activeColumnId is set even in Explorer view)
                    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                        e.preventDefault(); // Prevent browser's select-all

                        // Determine what to select based on current view
                        if (selectedFolderId === '__all__' || (selectedFolderId !== '__library__' && getFolderBookIds(selectedFolderId).length > 0)) {
                            // Viewing books - select all visible (filtered) books
                            const allVisibleBookIds = getFolderBookIds(selectedFolderId)
                                .map(id => books.find(b => b.id === id))
                                .filter(book => filterBookForExplorer(book))
                                .map(book => book.id);

                            setExplorerSelectedBooks(new Set(allVisibleBookIds));
                            setExplorerSelectedFolders(new Set()); // Clear folder selection
                            console.log(`✅ Selected ${allVisibleBookIds.length} book(s) in Explorer`);
                        } else {
                            // Viewing folders (My Library or folder with subfolders) - select all visible folders
                            const childFolders = selectedFolderId === '__library__'
                                ? [getInboxFolder(), ...getChildFolders(null).filter(f => f.id !== '__inbox__')].filter(Boolean)
                                : getChildFolders(selectedFolderId);

                            const allVisibleFolderIds = childFolders.map(f => f.id);

                            setExplorerSelectedFolders(new Set(allVisibleFolderIds));
                            setExplorerSelectedBooks(new Set()); // Clear book selection
                            console.log(`✅ Selected ${allVisibleFolderIds.length} folder(s) in Explorer`);
                        }
                    }

                    // v5.0.0-alpha.168 - Ctrl+X in Explorer view: Cut selected books
                    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && explorerSelectedBooks.size > 0) {
                        e.preventDefault();
                        // Can't cut from special folders
                        if (['__all__', '__library__', '__inbox__'].includes(selectedFolderId)) {
                            console.log('⚠️ Cannot cut books from virtual folders');
                            return;
                        }
                        const bookIds = Array.from(explorerSelectedBooks);
                        const sourcePositions = bookIds.map(bookId => ({
                            bookId,
                            folderId: selectedFolderId
                        }));
                        setClipboard({ type: 'cut', bookIds, sourcePositions });
                        const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} cut`;
                        setClipboardMessage(message);
                        setFooterClipboardVisible(false);
                        setToastVisible(true);
                        setToastAnimating(false);
                        setTimeout(() => {
                            setToastAnimating(true);
                            setTimeout(() => {
                                setToastVisible(false);
                                setToastAnimating(false);
                                setFooterClipboardVisible(true);
                            }, 1000);
                        }, 1500);
                        console.log(`✂️ Cut ${bookIds.length} book(s) to clipboard (Explorer)`);
                        return; // Don't fall through to Columns App handler
                    }

                    // v5.0.0-alpha.168 - Ctrl+C in Explorer view: Copy selected books
                    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && explorerSelectedBooks.size > 0) {
                        e.preventDefault();
                        const bookIds = Array.from(explorerSelectedBooks);
                        const sourcePositions = bookIds.map(bookId => ({
                            bookId,
                            folderId: selectedFolderId
                        }));
                        setClipboard({ type: 'copy', bookIds, sourcePositions });
                        const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} copied`;
                        setClipboardMessage(message);
                        setFooterClipboardVisible(false);
                        setToastVisible(true);
                        setToastAnimating(false);
                        setTimeout(() => {
                            setToastAnimating(true);
                            setTimeout(() => {
                                setToastVisible(false);
                                setToastAnimating(false);
                                setFooterClipboardVisible(true);
                            }, 1000);
                        }, 1500);
                        console.log(`📋 Copied ${bookIds.length} book(s) to clipboard (Explorer)`);
                        return; // Don't fall through to Columns App handler
                    }

                    // v5.0.0-alpha.168 - Ctrl+V in Explorer view: Paste books to current folder
                    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && clipboard.bookIds && clipboard.bookIds.length > 0) {
                        e.preventDefault();
                        // Can't paste to special folders
                        if (['__all__', '__library__', '__inbox__'].includes(selectedFolderId)) {
                            console.log('⚠️ Cannot paste into virtual folders');
                            return;
                        }
                        const targetFolderId = selectedFolderId;

                        if (clipboard.type === 'cut') {
                            // Cut: Remove from source folders, add to target
                            const sourcesByFolder = {};
                            clipboard.sourcePositions.forEach(pos => {
                                if (!sourcesByFolder[pos.folderId]) sourcesByFolder[pos.folderId] = [];
                                sourcesByFolder[pos.folderId].push(pos.bookId);
                            });

                            setFolders(prev => prev.map(folder => {
                                // Remove from source folders
                                if (sourcesByFolder[folder.id]) {
                                    return {
                                        ...folder,
                                        bookIds: folder.bookIds.filter(id => !sourcesByFolder[folder.id].includes(id))
                                    };
                                }
                                // Add to target folder
                                if (folder.id === targetFolderId) {
                                    const newBookIds = clipboard.bookIds.filter(id => !folder.bookIds.includes(id));
                                    return {
                                        ...folder,
                                        bookIds: [...folder.bookIds, ...newBookIds]
                                    };
                                }
                                return folder;
                            }));

                            recordAction({
                                type: 'PASTE_BOOKS_CUT',
                                bookIds: clipboard.bookIds,
                                sourcePositions: clipboard.sourcePositions,
                                targetFolderId
                            });

                            // Clear clipboard after cut-paste
                            setClipboard(null);
                            setClipboardMessage(null);
                            setFooterClipboardVisible(false);
                            console.log(`📥 Pasted ${clipboard.bookIds.length} book(s) (cut) to folder`);
                        } else {
                            // Copy: Just add to target folder
                            setFolders(prev => prev.map(folder => {
                                if (folder.id === targetFolderId) {
                                    const newBookIds = clipboard.bookIds.filter(id => !folder.bookIds.includes(id));
                                    return {
                                        ...folder,
                                        bookIds: [...folder.bookIds, ...newBookIds]
                                    };
                                }
                                return folder;
                            }));

                            recordAction({
                                type: 'PASTE_BOOKS_COPY',
                                bookIds: clipboard.bookIds,
                                targetFolderId
                            });

                            // Clipboard persists after copy-paste
                            console.log(`📥 Pasted ${clipboard.bookIds.length} book(s) (copy) to folder`);
                        }
                        return; // Don't fall through to Columns App handler
                    }

                    // v4.16.0 - Ctrl+X: Cut selected books
                    // v4.16.0.d - Parse composite keys "columnId:bookId:index" from selection
                    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedBooks.size > 0) {
                        e.preventDefault();
                        // Build source positions from composite keys
                        const sourcePositions = [];
                        const bookIds = [];
                        for (const key of selectedBooks) {
                            const [columnId, bookId, indexStr] = key.split(':');
                            const index = parseInt(indexStr, 10);
                            sourcePositions.push({ columnId, index, bookId });
                            bookIds.push(bookId);
                        }
                        setClipboard({ type: 'cut', bookIds, sourcePositions });
                        // v4.16.0.g - Set clipboard status message
                        const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} cut`;
                        setClipboardMessage(message);
                        // v4.16.0.l - Show toast and animate to footer
                        // v4.16.0.m - Slower animation (1.0s instead of 0.5s)
                        // v4.16.0.o - Hide footer text until toast lands
                        setFooterClipboardVisible(false);
                        setToastVisible(true);
                        setToastAnimating(false);
                        setTimeout(() => {
                            setToastAnimating(true);
                            setTimeout(() => {
                                setToastVisible(false);
                                setToastAnimating(false);
                                setFooterClipboardVisible(true); // Show footer text when toast lands
                            }, 1000); // Animation duration (2x slower)
                        }, 1500); // Wait before animating
                        console.log(`✂️ Cut ${bookIds.length} book(s) to clipboard`);
                    }

                    // v4.16.0 - Ctrl+C: Copy selected books
                    // v4.16.0.d - Parse composite keys "columnId:bookId:index" from selection
                    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBooks.size > 0) {
                        e.preventDefault();
                        const sourcePositions = [];
                        const bookIds = [];
                        for (const key of selectedBooks) {
                            const [columnId, bookId, indexStr] = key.split(':');
                            const index = parseInt(indexStr, 10);
                            // v4.16.0.ap - Capture instanceId for hidden state copying
                            // v4.16.0.be - Also capture isHidden for legacy entries
                            const column = columns.find(c => c.id === columnId);
                            const entry = column?.books[index];
                            const instanceId = entry ? getInstanceId(entry) : null;
                            // v4.16.0.be - Determine hidden state: GUID uses hiddenInstances, legacy uses book.isHidden
                            const book = books.find(b => b.id === bookId);
                            const isHidden = instanceId
                                ? hiddenInstances.has(instanceId)
                                : (book?.isHidden || false);
                            sourcePositions.push({ columnId, index, bookId, instanceId, isHidden });
                            bookIds.push(bookId);
                        }
                        setClipboard({ type: 'copy', bookIds, sourcePositions });
                        // v4.16.0.g - Set clipboard status message
                        const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} copied`;
                        setClipboardMessage(message);
                        // v4.16.0.l - Show toast and animate to footer
                        // v4.16.0.m - Slower animation (1.0s instead of 0.5s)
                        // v4.16.0.o - Hide footer text until toast lands
                        setFooterClipboardVisible(false);
                        setToastVisible(true);
                        setToastAnimating(false);
                        setTimeout(() => {
                            setToastAnimating(true);
                            setTimeout(() => {
                                setToastVisible(false);
                                setToastAnimating(false);
                                setFooterClipboardVisible(true); // Show footer text when toast lands
                            }, 1000); // Animation duration (2x slower)
                        }, 1500); // Wait before animating
                        console.log(`📋 Copied ${bookIds.length} book(s) to clipboard`);
                    }

                    // v4.16.0 - Ctrl+V: Paste to active column
                    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && clipboard.bookIds.length > 0) {
                        e.preventDefault();
                        if (!activeColumnId) {
                            console.log('⚠️ No active column - click a column first');
                            return;
                        }

                        const targetColumn = columns.find(col => col.id === activeColumnId);
                        if (!targetColumn) return;

                        // v4.16.0.ao - Calculate paste index: before selected book, or top if no selection
                        const selectedInTarget = getSelectedEntries().filter(sel => sel.columnId === activeColumnId);
                        const pasteIndex = selectedInTarget.length > 0
                            ? Math.min(...selectedInTarget.map(sel => sel.index))
                            : 0;

                        if (clipboard.type === 'cut') {
                            // Cut: Remove from source columns, add to target
                            // v4.16.0.k - Use sourcePositions to remove only specific instances
                            // v4.16.0.u - Preserve original entries (don't create new GUIDs for moves)
                            setColumns(prevColumns => {
                                // First pass: collect entries being removed (preserving original format)
                                const entriesToMove = [];
                                clipboard.sourcePositions.forEach(pos => {
                                    const sourceCol = prevColumns.find(c => c.id === pos.columnId);
                                    if (sourceCol && sourceCol.books[pos.index]) {
                                        entriesToMove.push(sourceCol.books[pos.index]);
                                    }
                                });

                                // v4.16.0.ao - Count how many items are being removed from target column BEFORE pasteIndex
                                const indicesToRemoveFromTarget = clipboard.sourcePositions
                                    .filter(pos => pos.columnId === activeColumnId && pos.index < pasteIndex)
                                    .length;
                                const adjustedPasteIndex = pasteIndex - indicesToRemoveFromTarget;

                                const newColumns = prevColumns.map(col => {
                                    // Build a set of indices to remove for this column
                                    const indicesToRemove = new Set();
                                    clipboard.sourcePositions.forEach(pos => {
                                        if (pos.columnId === col.id) {
                                            indicesToRemove.add(pos.index);
                                        }
                                    });

                                    return {
                                        ...col,
                                        books: col.books.filter((item, idx) => {
                                            if (typeof item === 'object' && item.type === 'divider') return true;
                                            return !indicesToRemove.has(idx);
                                        })
                                    };
                                });
                                // v4.16.0.ao - Add entries at adjusted paste index (before selected book)
                                const targetIdx = newColumns.findIndex(col => col.id === activeColumnId);
                                if (targetIdx !== -1) {
                                    const newBooks = [...newColumns[targetIdx].books];
                                    newBooks.splice(adjustedPasteIndex, 0, ...entriesToMove);
                                    newColumns[targetIdx] = {
                                        ...newColumns[targetIdx],
                                        books: newBooks
                                    };
                                }
                                return newColumns;
                            });
                            console.log(`✂️ Pasted (moved) ${clipboard.bookIds.length} book(s) to ${targetColumn.name}`);
                            // Clear clipboard after cut+paste
                            setClipboard(null);
                            // v4.16.0.g - Clear clipboard message after cut+paste
                            setClipboardMessage(null);
                            // v4.16.0.l - Clear toast state after cut+paste
                            setToastVisible(false);
                            setToastAnimating(false);
                            // v4.16.0.o - Clear footer clipboard visibility
                            setFooterClipboardVisible(false);
                            clearSelection();
                        } else {
                            // Copy: Add to target column (keep source)
                            // v4.16.0.s - Create new GUID-based entries for copied books
                            // v4.16.0.ao - Insert at paste index (before selected book)
                            // v4.16.0.ap - Copy hidden state from source instances
                            // v4.16.0.be - Use isHidden captured at copy time (supports legacy entries)
                            const newEntries = clipboard.sourcePositions.map(pos => ({
                                instanceId: generateInstanceId(),
                                bookId: pos.bookId,
                                sourceIsHidden: pos.isHidden // v4.16.0.be - Use captured hidden state
                            }));

                            // v4.16.0.ap - Copy hidden state for instances that were hidden
                            // v4.16.0.be - Use sourceIsHidden (captured at copy time) instead of checking hiddenInstances
                            const newHiddenInstanceIds = newEntries
                                .filter(entry => entry.sourceIsHidden)
                                .map(entry => entry.instanceId);

                            if (newHiddenInstanceIds.length > 0) {
                                setHiddenInstances(prev => {
                                    const updated = new Set(prev);
                                    newHiddenInstanceIds.forEach(id => updated.add(id));
                                    return updated;
                                });
                            }

                            // Clean entries before storing (remove sourceInstanceId)
                            const cleanEntries = newEntries.map(({ instanceId, bookId }) => ({ instanceId, bookId }));

                            setColumns(prevColumns => {
                                return prevColumns.map(col => {
                                    if (col.id === activeColumnId) {
                                        const newBooks = [...col.books];
                                        newBooks.splice(pasteIndex, 0, ...cleanEntries);
                                        return {
                                            ...col,
                                            books: newBooks
                                        };
                                    }
                                    return col;
                                });
                            });
                            console.log(`📋 Pasted (copied) ${clipboard.bookIds.length} book(s) to ${targetColumn.name}`);
                            // Keep clipboard for copy (can paste again)
                            // v4.16.0.g - Keep message for copy (can paste again)
                        }
                    }

                    // v5.0.0-alpha.46 - DEL key in Explorer: Remove selected books from current folder
                    if (e.key === 'Delete' && explorerSelectedBooks.size > 0) {
                        e.preventDefault();
                        // Can't remove from All Books (view-only) or Inbox
                        if (selectedFolderId === '__all__' || selectedFolderId === '__inbox__') {
                            console.log('🚫 Cannot remove books from All Books or Inbox');
                            return;
                        }
                        const folder = folders.find(f => f.id === selectedFolderId);
                        if (!folder) return;

                        const bookIdsToRemove = [...explorerSelectedBooks];
                        const fromIndices = bookIdsToRemove.map(id => (folder.bookIds || []).indexOf(id));

                        // Remove books from folder
                        setFolders(prev => prev.map(f => {
                            if (f.id === selectedFolderId) {
                                return { ...f, bookIds: (f.bookIds || []).filter(id => !explorerSelectedBooks.has(id)) };
                            }
                            return f;
                        }));

                        // Record for undo
                        recordAction({
                            type: 'REMOVE_BOOKS_FOLDER',
                            folderId: selectedFolderId,
                            bookIds: bookIdsToRemove,
                            fromIndices: fromIndices
                        });

                        console.log(`🗑️ Removed ${bookIdsToRemove.length} book(s) from "${folder.name}"`);
                        setExplorerSelectedBooks(new Set());
                        return; // Don't fall through to column delete
                    }

                    // v4.16.0.bd - DEL key: Delete selected books (with last-copy protection)
                    if (e.key === 'Delete' && selectedBooks.size > 0) {
                        e.preventDefault();
                        const selectedEntries = getSelectedEntries();
                        if (selectedEntries.length === 0) return;

                        // Count total copies of each bookId across ALL columns
                        const bookIdCounts = {};
                        columns.forEach(col => {
                            col.books.forEach(entry => {
                                const bookId = getBookIdFromEntry(entry);
                                if (bookId) {
                                    bookIdCounts[bookId] = (bookIdCounts[bookId] || 0) + 1;
                                }
                            });
                        });

                        // v4.16.0.bd - Count how many of each bookId are selected for deletion
                        const selectedCounts = {};
                        selectedEntries.forEach(sel => {
                            selectedCounts[sel.bookId] = (selectedCounts[sel.bookId] || 0) + 1;
                        });

                        // Categorize selected entries: last-copy vs deletable
                        // v4.16.0.bd - "last copy" = deleting would leave zero copies in library
                        const lastCopyEntries = [];
                        const deletableEntries = [];
                        selectedEntries.forEach(sel => {
                            const remainingAfterDelete = bookIdCounts[sel.bookId] - selectedCounts[sel.bookId];
                            if (remainingAfterDelete === 0) {
                                lastCopyEntries.push(sel);
                            } else {
                                deletableEntries.push(sel);
                            }
                        });

                        // Delete the deletable entries immediately
                        if (deletableEntries.length > 0) {
                            setColumns(prevColumns => {
                                // Build map of columnId -> indices to remove
                                const indicesToRemoveByColumn = {};
                                deletableEntries.forEach(sel => {
                                    if (!indicesToRemoveByColumn[sel.columnId]) {
                                        indicesToRemoveByColumn[sel.columnId] = new Set();
                                    }
                                    indicesToRemoveByColumn[sel.columnId].add(sel.index);
                                });

                                return prevColumns.map(col => {
                                    const indicesToRemove = indicesToRemoveByColumn[col.id];
                                    if (!indicesToRemove) return col;
                                    return {
                                        ...col,
                                        books: col.books.filter((_, idx) => !indicesToRemove.has(idx))
                                    };
                                });
                            });
                            console.log(`🗑️ Deleted ${deletableEntries.length} book(s)`);
                            clearSelection();
                        }

                        // Show dialog for last-copy entries (if any)
                        if (lastCopyEntries.length > 0) {
                            setLastCopyDialogData({
                                lastCopyEntries,
                                deletedCount: deletableEntries.length
                            });
                        }
                    }
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, [activeColumnId, columns, selectedBooks, clipboard, hiddenInstances, explorerSelectedBooks, selectedFolderId, folders]);

            // Initialize activeColumnId to first column when columns are loaded
            useEffect(() => {
                if (columns.length > 0 && !activeColumnId) {
                    setActiveColumnId(columns[0].id);
                }
            }, [columns, activeColumnId]);

            // Close context menu on click
            // v4.16.0.az - Also clear submenu state
            useEffect(() => {
                const handleClick = () => {
                    setContextMenu(null);
                    setContextSubmenu(null);
                };
                if (contextMenu) {
                    window.addEventListener('click', handleClick);
                    return () => window.removeEventListener('click', handleClick);
                }
            }, [contextMenu]);

            // v4.27.0 - Close divider context menu on click
            useEffect(() => {
                const handleClick = () => setDividerContextMenu(null);
                if (dividerContextMenu) {
                    window.addEventListener('click', handleClick);
                    return () => window.removeEventListener('click', handleClick);
                }
            }, [dividerContextMenu]);

            // v3.11.0.d - Close column menu and sort submenu on ESC key
            useEffect(() => {
                const handleEsc = (e) => {
                    if (e.key === 'Escape') {
                        if (sortMenuOpen !== null) {
                            setSortMenuOpen(null);
                        } else if (columnMenuOpen !== null) {
                            setColumnMenuOpen(null);
                        }
                    }
                };
                window.addEventListener('keydown', handleEsc);
                return () => window.removeEventListener('keydown', handleEsc);
            }, [columnMenuOpen, sortMenuOpen]);

            // v3.11.0.d - Close column menu on click outside
            useEffect(() => {
                const handleClickOutside = (e) => {
                    if (columnMenuOpen !== null && columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
                        setColumnMenuOpen(null);
                        setSortMenuOpen(null);
                    }
                };
                if (columnMenuOpen !== null) {
                    document.addEventListener('mousedown', handleClickOutside);
                    return () => document.removeEventListener('mousedown', handleClickOutside);
                }
            }, [columnMenuOpen]);

            // v5.0.0-alpha.133 - Close folder context menu on Esc key
            useEffect(() => {
                const handleEsc = (e) => {
                    if (e.key === 'Escape' && folderContextMenu) {
                        setFolderContextMenu(null);
                    }
                    // v5.0.0-alpha.165 - Close Explorer book context menu on Esc
                    if (e.key === 'Escape' && explorerBookContextMenu) {
                        setExplorerBookContextMenu(null);
                    }
                };
                window.addEventListener('keydown', handleEsc);
                return () => window.removeEventListener('keydown', handleEsc);
            }, [folderContextMenu, explorerBookContextMenu]);

            // v5.0.0-alpha.141 - Clear clipboard on Esc
            useEffect(() => {
                const handleEsc = (e) => {
                    if (e.key === 'Escape' && folderClipboard.items.length > 0) {
                        setFolderClipboard({ items: [], operation: null });
                        console.log('📋 Clipboard cleared');
                    }
                };
                window.addEventListener('keydown', handleEsc);
                return () => window.removeEventListener('keydown', handleEsc);
            }, [folderClipboard]);

            // v5.0.0-alpha.144 - Handle dialog dragging
            useEffect(() => {
                if (!dialogDrag?.isDragging) return;

                const handleMouseMove = (e) => {
                    setDialogDrag(prev => ({
                        ...prev,
                        dialogX: e.clientX - prev.offsetX,
                        dialogY: e.clientY - prev.offsetY
                    }));
                };

                const handleMouseUp = () => {
                    setDialogDrag(prev => ({ ...prev, isDragging: false }));
                };

                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
                return () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                };
            }, [dialogDrag?.isDragging]);

            // v5.0.0-alpha.133 - Close folder context menu on click outside
            useEffect(() => {
                const handleClickOutside = (e) => {
                    if (folderContextMenu && !e.target.closest('.fixed')) {
                        setFolderContextMenu(null);
                    }
                    // v5.0.0-alpha.165 - Close Explorer book context menu when clicking outside
                    if (explorerBookContextMenu && !e.target.closest('.fixed')) {
                        setExplorerBookContextMenu(null);
                    }
                };
                if (folderContextMenu || explorerBookContextMenu) {
                    document.addEventListener('mousedown', handleClickOutside);
                    return () => document.removeEventListener('mousedown', handleClickOutside);
                }
            }, [folderContextMenu, explorerBookContextMenu]);

            // v5.0.0-alpha.145 - Keyboard shortcuts for folder operations (Phase 6)
            useEffect(() => {
                const handleKeyboard = (e) => {
                    // Skip if user is typing in an input/textarea
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                    // Skip if dialog or context menu is open
                    if (folderContextMenu || folderPropertiesDialog) return;

                    const currentFolder = folders.find(f => f.id === selectedFolderId);
                    if (!currentFolder) return;

                    const isSpecialFolder = ['__all__', '__inbox__', '__library__'].includes(currentFolder.id);

                    // Ctrl+X - Cut folder
                    if (e.ctrlKey && e.key === 'x' && !isSpecialFolder) {
                        e.preventDefault();
                        setFolderClipboard({ items: [currentFolder.id], operation: 'cut' });
                        console.log(`✂️ Cut folder "${currentFolder.name}"`);
                    }

                    // Ctrl+C - Copy folder
                    if (e.ctrlKey && e.key === 'c' && !isSpecialFolder) {
                        e.preventDefault();
                        setFolderClipboard({ items: [currentFolder.id], operation: 'copy' });
                        console.log(`📋 Copied folder "${currentFolder.name}"`);
                    }

                    // Ctrl+V - Paste into current folder
                    if (e.ctrlKey && e.key === 'v' && folderClipboard.items.length > 0 && !isSpecialFolder) {
                        e.preventDefault();

                        const folderId = folderClipboard.items[0];
                        const folderToPaste = folders.find(f => f.id === folderId);
                        if (!folderToPaste) return;

                        // Check for circular reference
                        const isDescendantOf = (targetId, ancestorId) => {
                            if (!targetId || !ancestorId) return false;
                            let current = folders.find(f => f.id === targetId);
                            while (current) {
                                if (current.id === ancestorId) return true;
                                current = folders.find(f => f.id === current.parentId);
                            }
                            return false;
                        };

                        if (currentFolder.id === folderId || isDescendantOf(currentFolder.id, folderId)) {
                            alert("Cannot paste folder into itself or its descendants");
                            return;
                        }

                        if (folderClipboard.operation === 'cut') {
                            // Move folder
                            recordAction({
                                type: 'CUT_PASTE_FOLDER',
                                folderId: folderId,
                                oldParentId: folderToPaste.parentId,
                                newParentId: currentFolder.id
                            });
                            setFolders(prev => prev.map(f =>
                                f.id === folderId ? { ...f, parentId: currentFolder.id } : f
                            ));
                            setFolderClipboard({ items: [], operation: null });
                            console.log(`📌 Pasted (moved) "${folderToPaste.name}" into "${currentFolder.name}"`);
                        } else if (folderClipboard.operation === 'copy') {
                            // Deep copy folder
                            const copyFolderRecursive = (sourceFolderId, newParentId) => {
                                const sourceFolder = folders.find(f => f.id === sourceFolderId);
                                if (!sourceFolder) return null;

                                const newId = '__folder__' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                const newFolder = {
                                    ...sourceFolder,
                                    id: newId,
                                    name: sourceFolder.name + ' (Copy)',
                                    parentId: newParentId,
                                    created: Date.now()
                                };

                                const children = folders.filter(f => f.parentId === sourceFolderId);
                                return { folder: newFolder, children: children.map(child => copyFolderRecursive(child.id, newId)) };
                            };

                            const copyTree = copyFolderRecursive(folderId, currentFolder.id);
                            if (copyTree) {
                                const flattenCopyTree = (tree) => {
                                    const result = [tree.folder];
                                    tree.children.forEach(child => {
                                        if (child) result.push(...flattenCopyTree(child));
                                    });
                                    return result;
                                };
                                const newFolders = flattenCopyTree(copyTree);

                                recordAction({
                                    type: 'COPY_PASTE_FOLDER',
                                    newFolderIds: newFolders.map(f => f.id)
                                });
                                setFolders(prev => [...prev, ...newFolders]);
                                console.log(`📌 Pasted (copied) "${folderToPaste.name}" into "${currentFolder.name}"`);
                            }
                        }
                    }

                    // v5.0.0-alpha.160 - F2 - Rename folder (simplified logic)
                    if (e.key === 'F2') {
                        e.preventDefault();

                        // Priority 1: If exactly one folder is selected in right panel, rename it there
                        if (explorerSelectedFolders.size === 1) {
                            const folderId = Array.from(explorerSelectedFolders)[0];
                            const folder = folders.find(f => f.id === folderId);
                            if (folder && !['__all__', '__inbox__', '__library__'].includes(folder.id)) {
                                setRightPanelEditingId(folder.id);
                                setRightPanelEditingName(folder.name);
                                setRightPanelPlaceholderMode(false);
                                console.log(`✏️ F2: Renaming "${folder.name}" in right panel`);
                            }
                        }
                        // Priority 2: Otherwise rename currently viewed folder in left panel
                        else if (currentFolder && !isSpecialFolder) {
                            setEditingFolderId(currentFolder.id);
                            setEditingFolderName(currentFolder.name);
                            setIsPlaceholderMode(false);
                            console.log(`✏️ F2: Renaming "${currentFolder.name}" in left panel`);
                        }
                    }

                    // Delete - Delete current folder
                    if (e.key === 'Delete' && !isSpecialFolder) {
                        e.preventDefault();

                        const hasChildren = folders.some(f => f.parentId === currentFolder.id);
                        const hasBooks = currentFolder.bookIds && currentFolder.bookIds.length > 0;

                        let confirmMsg = `Delete folder "${currentFolder.name}"?`;
                        if (hasBooks && hasChildren) {
                            confirmMsg = `Delete folder "${currentFolder.name}" and its ${currentFolder.bookIds.length} book(s) and subfolders? Books will move to parent folder.`;
                        } else if (hasBooks) {
                            confirmMsg = `Delete folder "${currentFolder.name}" and its ${currentFolder.bookIds.length} book(s)? Books will move to parent folder.`;
                        } else if (hasChildren) {
                            confirmMsg = `Delete folder "${currentFolder.name}" and all its subfolders?`;
                        }

                        if (!confirm(confirmMsg)) return;

                        // Collect all folders to delete (folder + descendants)
                        const getAllDescendantIds = (folderId) => {
                            const children = folders.filter(f => f.parentId === folderId);
                            let allIds = children.map(c => c.id);
                            children.forEach(child => {
                                allIds = [...allIds, ...getAllDescendantIds(child.id)];
                            });
                            return allIds;
                        };

                        const descendantIds = getAllDescendantIds(currentFolder.id);
                        const foldersToDelete = [currentFolder, ...folders.filter(f => descendantIds.includes(f.id))];

                        // Move orphaned books to parent
                        const orphanedBookIds = [];
                        foldersToDelete.forEach(folder => {
                            if (folder.bookIds) orphanedBookIds.push(...folder.bookIds);
                        });

                        recordAction({
                            type: 'DELETE_FOLDER',
                            folderId: currentFolder.id,
                            deletedFolders: foldersToDelete,
                            orphanedBookIds: orphanedBookIds,
                            newParentId: currentFolder.parentId
                        });

                        const folderIdsToDelete = new Set(foldersToDelete.map(f => f.id));

                        // Move orphaned books to parent folder
                        if (orphanedBookIds.length > 0) {
                            setFolders(prev => {
                                const updated = prev.filter(f => !folderIdsToDelete.has(f.id));
                                const parentFolder = updated.find(f => f.id === currentFolder.parentId);
                                if (parentFolder) {
                                    return updated.map(f =>
                                        f.id === parentFolder.id
                                            ? { ...f, bookIds: [...new Set([...(f.bookIds || []), ...orphanedBookIds])] }
                                            : f
                                    );
                                }
                                return updated;
                            });
                        } else {
                            setFolders(prev => prev.filter(f => !folderIdsToDelete.has(f.id)));
                        }

                        // Navigate to parent or All Books
                        if (selectedFolderId === currentFolder.id || folderIdsToDelete.has(selectedFolderId)) {
                            navigateToFolder(currentFolder.parentId || '__all__');
                        }

                        console.log(`🗑️ Deleted folder "${currentFolder.name}" and ${foldersToDelete.length - 1} descendants`);
                    }

                    // Enter - Open/navigate to folder (if not already viewing it)
                    // This is useful when focused on a folder in the tree but viewing a different folder
                    // For now, skipping this as it's not as clear when it would be useful
                    // Users can click or use context menu "Open" instead
                };

                window.addEventListener('keydown', handleKeyboard);
                return () => window.removeEventListener('keydown', handleKeyboard);
            }, [selectedFolderId, folders, folderClipboard, folderContextMenu, folderPropertiesDialog, explorerSelectedFolders]); // v5.0.0-alpha.157 - Added explorerSelectedFolders for F2

            // v5.0.0-alpha.175.48 - Removed saveSettings function (dead code)

            const importLibrary = async () => {
                // Close the dialog immediately when file picker opens
                setStatusModalOpen(false);

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const text = await file.text();
                            const parsedData = JSON.parse(text);

                            // v4.0.0.b: Detect backup vs library file
                            let organizationFromFile = null;
                            if (parsedData.isBackup === true) {
                                // Backup file - prompt user before restoring
                                const confirmed = window.confirm(
                                    'Restore backup?\n\nThis will replace your current organization with the organization from the backup file.'
                                );
                                if (!confirmed) {
                                    console.log('📋 Backup restore cancelled by user');
                                    return;
                                }
                                // Extract organization from backup file
                                if (parsedData.organization) {
                                    organizationFromFile = parsedData.organization;
                                    console.log('📋 Restoring organization from backup file');
                                } else {
                                    console.log('⚠️ Backup file has no organization section - will start fresh');
                                }
                            } else {
                                // Library file - keep current organization, ignore any org in file
                                console.log('📋 Loading library file - keeping current organization');
                            }

                            const syncTime = Date.now();
                            setLastSyncTime(syncTime);

                            // Show loading status while waiting
                            setSyncStatus('loading');

                            let timeoutId;
                            let callbackFired = false;

                            // Setup timeout (60 seconds for large libraries)
                            timeoutId = setTimeout(() => {
                                if (!callbackFired) {
                                    console.error('⚠️ Status check timed out after 60 seconds');
                                    setSyncStatus('unknown');
                                    alert('Library loaded but status check timed out. Please refresh the page.');
                                }
                            }, 60000);

                            // Load data with callback (pass organization for backup restore)
                            await loadLibrary(text, () => {
                                callbackFired = true;
                                clearTimeout(timeoutId);
                                // checkManifest removed in v3.6.1 - status updated in loadLibrary
                            }, organizationFromFile);

                            new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/file-imported';
                        } catch (error) {
                            console.error('Failed to sync:', error);
                            setSyncStatus('none'); // Clear loading spinner (v3.9.0.l)
                            if (error && error.message) {
                                console.error('Error details:', error.message, error.stack);
                                alert(`Failed to load library file: ${error.message}`);
                            } else {
                                console.error('Error details: Unknown error (null or no message)');
                                alert('Failed to load library file: Unknown error');
                            }
                        }
                    }
                };
                input.click();
            };

            const openCollectSeriesDialog = () => {
                if (!modalBook || !modalBook.series || !modalColumnId) return;

                const currentColumn = columns.find(c => c.id === modalColumnId);
                if (!currentColumn) return;

                const allSeriesBooks = books.filter(b =>
                    b.series && b.series === modalBook.series && b.id !== modalBook.id
                );

                // v4.16.0.s - Use helper for both legacy and new entry formats
                const inCurrentColumn = allSeriesBooks.filter(b =>
                    columnHasBook(currentColumn.books, b.id)
                );

                const inOtherColumns = allSeriesBooks.filter(b =>
                    !columnHasBook(currentColumn.books, b.id)
                ).map(b => {
                    const col = columns.find(c => columnHasBook(c.books, b.id));
                    return { ...b, columnName: col?.name || 'Unknown' };
                });

                const sortByPosition = (a, b) => {
                    const posA = parseInt(a.seriesPosition) || 999;
                    const posB = parseInt(b.seriesPosition) || 999;
                    return posA - posB;
                };

                inCurrentColumn.sort(sortByPosition);
                inOtherColumns.sort(sortByPosition);

                setSeriesBooks({
                    current: inCurrentColumn,
                    other: inOtherColumns
                });

                setCollectSeriesOpen(true);
            };

            const collectSeriesBooks = (includeAllColumns) => {
                if (!modalBook || !modalColumnId) return;

                const targetColumn = columns.find(c => c.id === modalColumnId);
                if (!targetColumn) return;

                const booksToCollect = includeAllColumns
                    ? [...seriesBooks.current, ...seriesBooks.other]
                    : seriesBooks.current;

                if (booksToCollect.length === 0) {
                    setCollectSeriesOpen(false);
                    return;
                }

                const allBooksInSeries = [modalBook, ...booksToCollect].sort((a, b) => {
                    const posA = parseInt(a.seriesPosition) || 999;
                    const posB = parseInt(b.seriesPosition) || 999;
                    return posA - posB;
                });

                // v4.16.0.s - Use helper for index lookup with both entry formats
                const currentBookIndexInTarget = findBookIndexInColumn(targetColumn.books, modalBook.id);

                const newColumns = columns.map(col => {
                    if (col.id === modalColumnId) {
                        // v4.16.0.s - Filter using helper, create new GUID entries
                        let newBooks = col.books.filter(entry => {
                            const entryBookId = getBookIdFromEntry(entry);
                            return !allBooksInSeries.find(b => b.id === entryBookId);
                        });

                        const insertIndex = Math.min(currentBookIndexInTarget, newBooks.length);
                        // v4.16.0.s - Create new GUID entries for collected series books
                        const newEntries = allBooksInSeries.map(b => ({
                            instanceId: generateInstanceId(),
                            bookId: b.id
                        }));
                        newBooks.splice(insertIndex, 0, ...newEntries);

                        return { ...col, books: newBooks };
                    } else if (includeAllColumns) {
                        return {
                            ...col,
                            // v4.16.0.s - Filter using helper
                            books: col.books.filter(entry => {
                                const entryBookId = getBookIdFromEntry(entry);
                                return !allBooksInSeries.find(b => b.id === entryBookId);
                            })
                        };
                    }
                    return col;
                });

                setColumns(newColumns);
                setCollectSeriesOpen(false);
            };

            const renderStars = (rating) => {
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

                return (
                    <span className="text-yellow-500 text-2xl">
                        {'★'.repeat(fullStars)}
                        {hasHalfStar && '½'}
                        {'☆'.repeat(emptyStars)}
                    </span>
                );
            };

            // Schema v2.0: Export unified file with organization
            const exportLibrary = async () => {
                try {
                    const allBooks = await loadBooksFromIndexedDB();

                    // Convert app book format back to fetcher format for books.items
                    // v4.18.0.a - Export uses onWishlist + ownershipType (new format)
                    // v4.18.0.d - Export includes price data, genres, targetPrice (user metadata)
                    const bookItems = allBooks.map(book => ({
                        asin: book.asin,
                        onWishlist: book.onWishlist || false,
                        ownershipType: book.ownershipType || 'purchased',
                        isHidden: book.isHidden || false,
                        addedToWishlist: book.addedToWishlist || '',
                        title: book.title,
                        authors: book.author,
                        coverUrl: book.coverUrl,
                        rating: book.rating,
                        reviewCount: book.ratingCount,
                        series: book.series,
                        seriesPosition: book.seriesPosition,
                        acquisitionDate: book.acquired,
                        description: book.description,
                        topReviews: book.topReviews,
                        binding: book.binding,
                        // v4.18.0.d - Price data and user metadata
                        currentPrice: book.currentPrice,
                        listPrice: book.listPrice,
                        priceAsOf: book.priceAsOf,
                        targetPrice: book.targetPrice,
                        genres: book.genres,
                        genresAsOf: book.genresAsOf,
                        // v5.0.0-alpha.175.28 - User metadata (tags, notes, price alerts)
                        tags: book.tags,
                        note: book.userNote,
                        priceTrigger: book.priceTrigger,
                        myRating: book.myRating || 0  // v5.0.0-alpha.175.31 - Personal rating (0=unrated, 1-5=rated)
                    }));

                    // Build collections.items from books that have collection data
                    const collectionItems = allBooks
                        .filter(book => book.collections || book.readStatus)
                        .map(book => ({
                            asin: book.asin,
                            readStatus: book.readStatus || 'UNKNOWN',
                            collections: book.collections || []
                        }));

                    // v4.0.0.b: Build v2.x backup format with isBackup flag
                    // v4.15.1.b: Only include collections section if we have real collections data
                    const hasRealCollections = collectionsStatus.loadStatus !== 'empty' && collectionsStatus.loadDate;
                    const exportData = {
                        schemaVersion: "2.3",
                        isBackup: true,
                        books: {
                            fetchDate: libraryStatus.loadDate || new Date().toISOString(),
                            fetcherVersion: "app-export",
                            totalBooks: bookItems.length,
                            items: bookItems
                        },
                        organization: {
                            columns: columns.map(col => ({
                                id: col.id,
                                name: col.name,
                                items: col.books  // Array of book IDs and divider IDs
                            })),
                            columnOrder: columns.map(col => col.id),
                            blankImageBooks: Array.from(blankImageBooks),
                            // v5.0.0-alpha.99 - Include folder organization for Explorer view
                            folders: folders.map(folder => ({
                                id: folder.id,
                                name: folder.name,
                                bookIds: folder.bookIds || [],
                                parentId: folder.parentId,
                                collapsed: folder.collapsed,
                                childFolderIds: folder.childFolderIds
                            })),
                            // v5.0.0-alpha.101 - Include Explorer view settings
                            explorerSettings: {
                                // v5.0.2 - viewMode removed (always Explorer mode)
                                folderSortSettings,
                                explorerView,
                                explorerCoverCols,
                                leftPaneWidth,
                                visibleColumns, // v5.0.0-alpha.109
                                // v5.0.3-alpha.1 - Sanitize column widths before export
                                columnWidths: (() => {
                                    const defaultWidths = {
                                        title: 200, author: 150, series: 150, seriesNum: 50, rating: 96,
                                        myRating: 100, dateAdded: 112, price: 80, priceGoal: 80, delta: 80, amazon: 70
                                    };
                                    return Object.fromEntries(
                                        Object.keys(defaultWidths).map(key => [
                                            key,
                                            columnWidths[key] ?? defaultWidths[key]
                                        ])
                                    );
                                })()
                            },
                            exportDate: new Date().toISOString(),
                            tagRegistry, // v5.0.0-alpha.175 - Tag registry
                            hiddenInstances: Array.from(hiddenInstances), // v4.16.0.z
                            appVersion: ORGANIZER_VERSION
                        }
                    };

                    // v4.15.1.b: Only add collections section if we have real data (fix 0-A bug)
                    if (hasRealCollections) {
                        exportData.collections = {
                            fetchDate: collectionsStatus.loadDate,
                            fetcherVersion: "app-export",
                            totalBooksScanned: collectionItems.length,
                            booksWithCollections: collectionItems.filter(b => b.collections.length > 0).length,
                            items: collectionItems
                        };
                    }

                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    // v4.15.7: Backup filename with local date and time (fixes UTC date bug after 6pm)
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}`;
                    a.download = `readerwrangler-backup-${dateStr}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    console.log('✅ Backup exported (v2.0 format with organization)');
                    new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/file-exported';
                } catch (error) {
                    console.error('Failed to export library:', error);
                    alert('Failed to export library');
                }
            };

            const clearLibrary = () => {
                setResetConfirmOpen(true);
            };

            const confirmReset = async () => {
                setResetConfirmOpen(false);
                try {
                    await clearIndexedDB();
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(CACHE_KEY);
                    localStorage.removeItem(STATUS_KEY); // v3.7.0.n - clear saved status
                    localStorage.removeItem(FILTERS_KEY); // v3.8.0.h - clear saved filters
                    localStorage.removeItem(EXPLORER_KEY); // v5.0.0-alpha.99 - clear Explorer view settings
                    localStorage.removeItem(FOLDERS_KEY); // v5.0.0-alpha.99 - clear folder organization

                    // Reset all filters (v3.8.0.h, updated v3.8.0.k, v4.1.0.d)
                    setSearchTerm('');
                    setReadStatusFilter('');
                    setCollectionFilter('');
                    setRatingFilter('');
                    setSeriesFilter('');
                    setDateFrom('');
                    setDateTo('');
                    setShowHidden(true); // v4.8.0 - Default to showing all books on reset

                    setBooks([]);
                    setColumns([{ id: 'unorganized', name: 'Unorganized', books: [] }]);
                    setDataSource('none');
                    setBlankImageBooks(new Set());
                    setLastSyncTime(null);
                    setSyncStatus('none');
                    // Reset v3.9.0 status bar state (Load-state-only)
                    setLibraryStatus({
                        loadStatus: 'empty',
                        loadDate: null
                    });
                    setCollectionsStatus({
                        loadStatus: 'empty',
                        loadDate: null
                    });

                    // v5.0.0-alpha.99 - Reset Explorer view state (folders and view settings)
                    setFolders([{ id: '__inbox__', name: 'Inbox', bookIds: [], parentId: null }]);
                    setSelectedFolderId('__all__');
                    setExplorerSort([{ column: 'dateAdded', direction: 'desc' }]);
                    setFolderSortSettings({}); // v5.0.0-alpha.100 - Clear per-folder sort settings
                    setTagRegistry({}); // v5.0.0-alpha.175.28 - Clear tag registry on reset
                    setExplorerView('list');

                    console.log('✅ Cleared library - app reset to initial state');
                    new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/app-reset';
                } catch (error) {
                    console.error('Failed to clear library:', error);
                    alert('Failed to clear library data');
                }
            };

            const handleFileUpload = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const text = await file.text();

                if (file.name.endsWith('.json')) {
                    await loadLibrary(text);
                } else if (file.name.endsWith('.csv')) {
                    loadBooksFromCSV(text);
                }
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/file-imported';
            };

            const loadBooksFromCSV = (csvContent) => {
                const lines = csvContent.split('\n');
                const parsedBooks = [];

                const startLine = lines[0].includes('ASIN') ? 1 : 0;

                for (let i = startLine; i < lines.length && parsedBooks.length < 100; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const parts = line.split(',');
                    let asin = parts[0]?.trim().replace(/[="']/g, '');

                    if (asin && asin.length < 10 && /^[0-9]+$/.test(asin)) {
                        asin = asin.padStart(10, '0');
                    }

                    if (asin && asin.length === 10) {
                        parsedBooks.push({
                            id: asin,  // Use ASIN as stable ID instead of sequential number
                            asin: asin,
                            title: parts[6] || 'Unknown',
                            author: parts[13] || 'Unknown',
                            acquired: parts[2] || '',
                            series: parts[12] || '',
                            coverUrl: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`,
                            hasEnrichedData: false
                        });
                    }
                }

                setBooks(parsedBooks);
                setColumns([{ id: 'unorganized', name: 'Unorganized', books: parsedBooks.map(b => b.id) }]);
                setDataSource('csv');
            };

            const mergeCollectionsIntoBooks = async (booksToMerge) => {
                // Only use collections data if user has loaded it via File Picker (v3.9.0)
                const collections = collectionsData;
                if (!collections) {
                    console.log('No collections data available to merge');
                    return booksToMerge;
                }

                // Merge collections into each book
                const mergedBooks = booksToMerge.map(book => {
                    const bookCollections = collections.get(book.asin) || { readStatus: 'UNKNOWN', collections: [] };
                    return {
                        ...book,
                        readStatus: bookCollections.readStatus,
                        collections: bookCollections.collections
                    };
                });

                // Log results
                const booksWithCollections = mergedBooks.filter(b => b.collections.length > 0).length;
                const readBooks = mergedBooks.filter(b => b.readStatus === 'READ').length;
                const unreadBooks = mergedBooks.filter(b => b.readStatus === 'UNREAD').length;
                console.log(`📚 Collections data merged:`);
                console.log(`   - ${booksWithCollections} books have collections`);
                console.log(`   - ${readBooks} READ, ${unreadBooks} UNREAD, ${mergedBooks.length - readBooks - unreadBooks} UNKNOWN`);

                return mergedBooks;
            };

            const loadLibrary = async (content, onComplete = null, organizationFromFile = null) => {
                const parsedData = JSON.parse(content);

                // Check if user selected legacy collections file (v3.9.0.k)
                if (parsedData.type === 'collections') {
                    console.error('❌ Wrong file type selected');
                    console.error('   You selected an old Collections file');
                    console.error('   Please select amazon-library.json instead');
                    throw new Error('You selected an old Collections file. Please select amazon-library.json instead.');
                }

                let data;           // Array of book items
                let metadata;       // Books metadata (fetchDate, fetcherVersion, etc.)
                let collections;    // Collections map (ASIN -> {readStatus, collections})

                // Schema v2.x - unified format with books.items and collections.items
                if (parsedData.schemaVersion?.startsWith('2.')) {
                    if (!parsedData.books || !parsedData.books.items) {
                        console.error('❌ Invalid v2.x library format');
                        console.error('   Expected: {schemaVersion: "2.x", books: {items: [...]}}');
                        console.error('   Received:', Object.keys(parsedData));
                        throw new Error('Invalid v2.x library format - please re-fetch your library using the latest fetcher');
                    }

                    data = parsedData.books.items;
                    metadata = {
                        schemaVersion: parsedData.schemaVersion,
                        fetchDate: parsedData.books.fetchDate,
                        fetcherVersion: parsedData.books.fetcherVersion,
                        totalBooks: parsedData.books.totalBooks || data.length
                    };

                    console.log(`📋 Loaded schema ${parsedData.schemaVersion} unified file`);
                    console.log(`   Total books: ${metadata.totalBooks}`);
                    console.log(`   Fetched: ${new Date(metadata.fetchDate).toLocaleString()}`);
                    console.log(`   Fetcher version: ${metadata.fetcherVersion}`);

                    // Extract embedded collections from v2.0 file
                    if (parsedData.collections && parsedData.collections.items) {
                        collections = new Map();
                        parsedData.collections.items.forEach(book => {
                            collections.set(book.asin, {
                                readStatus: book.readStatus,
                                collections: book.collections || []
                            });
                        });
                        console.log(`📚 Loaded embedded collections for ${collections.size} books`);
                        console.log(`   Collections fetched: ${new Date(parsedData.collections.fetchDate).toLocaleString()}`);

                        // Update collections status
                        const collectionsLoadStatus = parsedData.collections.fetchDate ? calculateFreshness(parsedData.collections.fetchDate) : 'unknown';
                        setCollectionsStatus({
                            loadStatus: collectionsLoadStatus,
                            loadDate: parsedData.collections.fetchDate || null
                        });
                        setCollectionsData(collections);
                    } else {
                        console.log('📚 No collections data in file (run Collections Fetcher to add)');
                        collections = null;
                        // Reset collections status when no collections in file (v4.15.1 - bug fix 0-A)
                        setCollectionsStatus({
                            loadStatus: 'empty',
                            loadDate: null
                        });
                    }
                }
                // Legacy v1.x format - object with metadata and books array
                else if (parsedData.metadata && parsedData.books) {
                    data = parsedData.books;
                    metadata = parsedData.metadata;

                    console.log(`📋 Loaded legacy schema ${metadata.schemaVersion}`);
                    console.log(`   Total books: ${metadata.totalBooks}`);
                    console.log(`   Fetched: ${new Date(metadata.fetchDate).toLocaleString()}`);
                    console.log(`   Fetcher version: ${metadata.fetcherVersion}`);
                    console.log(`   ⚠️  Note: Re-run fetchers to upgrade to v2.0 format`);

                    // Legacy format - collections loaded separately (use existing collectionsData state)
                    collections = collectionsData || null;
                }
                else {
                    console.error('❌ Invalid library JSON format');
                    console.error('   Expected: v2.0 unified or legacy {metadata, books}');
                    console.error('   Received:', Object.keys(parsedData));
                    throw new Error('Invalid library JSON format - please re-fetch your library using the latest fetcher');
                }

                // Update library status from loaded JSON metadata
                const loadStatus = metadata.fetchDate ? calculateFreshness(metadata.fetchDate) : 'unknown';

                setLibraryStatus({
                    loadStatus,
                    loadDate: metadata.fetchDate || null
                });

                const extractDescription = (descData) => {
                    if (!descData?.sections?.[0]?.content) return '';

                    const content = descData.sections[0].content;

                    if (content.text) return content.text;

                    if (content.fragments) {
                        const texts = [];
                        content.fragments.forEach(frag => {
                            if (frag.text) {
                                texts.push(frag.text);
                            } else if (frag.semanticContent?.content?.text) {
                                texts.push(frag.semanticContent.content.text);
                            } else if (frag.semanticContent?.content?.fragments) {
                                frag.semanticContent.content.fragments.forEach(subfrag => {
                                    if (subfrag.text) texts.push(subfrag.text);
                                    if (subfrag.semanticContent?.content?.text) {
                                        texts.push(subfrag.semanticContent.content.text);
                                    }
                                });
                            }
                        });
                        return texts.join(' ').trim();
                    }

                    return '';
                };

                const processedBooks = data.map((item) => {
                    const isNewFormat = !item.amazonData;

                    // Get collections data for this book (if available)
                    const bookCollections = collections?.get(item.asin) || { readStatus: 'UNKNOWN', collections: [] };

                    if (isNewFormat) {
                        // v4.18.0.a - Use normalizeBook to handle legacy isOwned/isWishlist fields
                        const normalized = normalizeBook(item);
                        return {
                            id: item.asin,  // Use ASIN as stable ID instead of sequential number
                            asin: item.asin,
                            title: item.title || 'Unknown',
                            author: item.authors || 'Unknown',
                            acquired: item.acquisitionDate || '',
                            series: item.series || '',
                            seriesPosition: item.seriesPosition || '',
                            seriesTotal: '',
                            rating: item.rating || 0,
                            ratingCount: item.reviewCount || '',
                            description: item.description || '',
                            topReviews: item.topReviews || [],
                            binding: item.binding || 'Kindle eBook',
                            coverUrl: item.coverUrl,
                            publicationDate: item.publicationDate || '',
                            hasEnrichedData: true,
                            store: "Amazon",
                            // v4.18.0.a - onWishlist replaces isWishlist (normalized handles legacy)
                            onWishlist: normalized.onWishlist,
                            isHidden: item.isHidden || false,
                            addedToWishlist: item.addedToWishlist || '',
                            // Ownership type (v4.9.0, v4.18.0.a - normalized handles 'wishlist' type)
                            ownershipType: normalized.ownershipType,
                            // Collections data
                            readStatus: bookCollections.readStatus,
                            collections: bookCollections.collections,
                            // Price data (v4.17.0.a, v4.18.0.a - parse string prices to numbers)
                            currentPrice: parsePrice(item.currentPrice),
                            listPrice: parsePrice(item.listPrice),
                            priceFetchedAt: item.priceFetchedAt || null,
                            priceTrigger: item.priceTrigger ?? null,
                            // Genre data (v4.17.0.a)
                            genres: item.genres || [],
                            // v5.0.0-alpha.175.28 - User metadata (tags, notes)
                            tags: item.tags,
                            userNote: item.note,
                            myRating: item.myRating || 0  // v5.0.0-alpha.175.31 - Personal rating
                        };
                    } else {
                        // Legacy format with amazonData (v1.x format)
                        const amazonData = item.amazonData?.data?.getProduct;
                        const imageData = amazonData?.images?.images?.[0]?.hiRes;

                        let asin = item.asin;
                        if (asin && asin.length < 10 && /^[0-9]+$/.test(asin)) {
                            asin = asin.padStart(10, '0');
                        }

                        let coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`;
                        if (imageData?.physicalId) {
                            coverUrl = `https://images-na.ssl-images-amazon.com/images/I/${imageData.physicalId}.${imageData.extension}`;
                        }

                        // v4.18.0.a - Use normalizeBook to handle legacy isOwned/isWishlist fields
                        const normalized = normalizeBook(item);

                        return {
                            id: asin,  // Use ASIN as stable ID instead of sequential number
                            asin: asin,
                            title: amazonData?.title?.displayString || item.title || 'Unknown',
                            author: amazonData?.byLine?.contributors?.[0]?.contributor?.author?.profile?.displayName || item.author || 'Unknown',
                            acquired: amazonData?.pastPurchase?.purchaseHistory?.lastOrderDate || item.acquired || '',
                            series: amazonData?.bookSeries?.singleBookView?.series?.title || '',
                            seriesPosition: amazonData?.bookSeries?.singleBookView?.series?.position || '',
                            seriesTotal: amazonData?.bookSeries?.singleBookView?.series?.numberOfBooks || '',
                            rating: amazonData?.customerReviewsSummary?.rating?.value || 0,
                            ratingCount: amazonData?.customerReviewsSummary?.count?.displayString || '',
                            description: extractDescription(amazonData?.description),
                            topReviews: amazonData?.customerReviewsTop?.reviews || [],
                            binding: amazonData?.bindingInformation?.binding?.displayString || 'Kindle eBook',
                            coverUrl: coverUrl,
                            publicationDate: '', // Legacy format doesn't have publication date
                            hasEnrichedData: true,
                            store: "Amazon",
                            // v4.18.0.a - onWishlist replaces isWishlist (normalized handles legacy)
                            onWishlist: normalized.onWishlist,
                            isHidden: item.isHidden || false,
                            addedToWishlist: item.addedToWishlist || '',
                            // Ownership type (v4.9.0, v4.18.0.a - normalized handles 'wishlist' type)
                            ownershipType: normalized.ownershipType,
                            // Collections data
                            readStatus: bookCollections.readStatus,
                            collections: bookCollections.collections,
                            // Price data (v4.17.0.a, v4.18.0.a - parse string prices to numbers)
                            currentPrice: parsePrice(item.currentPrice),
                            listPrice: parsePrice(item.listPrice),
                            priceFetchedAt: item.priceFetchedAt || null,
                            priceTrigger: item.priceTrigger ?? null,
                            // Genre data (v4.17.0.a)
                            genres: item.genres || [],
                            // v5.0.0-alpha.175.28 - User metadata (tags, notes)
                            tags: item.tags,
                            userNote: item.note,
                            myRating: item.myRating || 0  // v5.0.0-alpha.175.31 - Personal rating
                        };
                    }
                });

                // Sort books by acquisition date (newest first) to maintain original order
                try {
                    processedBooks.sort((a, b) => {
                        // Handle missing dates - put them at the end
                        if (!a.acquired && !b.acquired) return 0;
                        if (!a.acquired) return 1;
                        if (!b.acquired) return -1;

                        // Parse dates safely
                        const dateA = new Date(a.acquired);
                        const dateB = new Date(b.acquired);

                        // Handle invalid dates
                        const isValidA = !isNaN(dateA.getTime());
                        const isValidB = !isNaN(dateB.getTime());

                        if (!isValidA && !isValidB) return 0;
                        if (!isValidA) return 1;
                        if (!isValidB) return -1;

                        // Compare dates (descending - newest first)
                        return dateB - dateA;
                    });
                    console.log('✅ Books sorted by acquisition date (newest first)');
                } catch (error) {
                    console.error('❌ Sort failed:', error);
                    console.error('Error details:', error.message, error.stack);
                    // Continue without sorting if sort fails
                }

                // Log collections merge results
                if (collections) {
                    const booksWithCollections = processedBooks.filter(b => b.collections.length > 0).length;
                    const readBooks = processedBooks.filter(b => b.readStatus === 'READ').length;
                    const unreadBooks = processedBooks.filter(b => b.readStatus === 'UNREAD').length;
                    console.log(`📚 Collections data merged:`);
                    console.log(`   - ${booksWithCollections} books have collections`);
                    console.log(`   - ${readBooks} READ, ${unreadBooks} UNREAD, ${processedBooks.length - readBooks - unreadBooks} UNKNOWN`);
                }

                // v5.0.0-alpha.175.28 - Debug: Log tags and notes data
                const booksWithTags = processedBooks.filter(b => b.tags && b.tags.length > 0).length;
                const booksWithNotes = processedBooks.filter(b => b.userNote).length;
                if (booksWithTags > 0 || booksWithNotes > 0) {
                    console.log(`🏷️ User metadata imported:`);
                    console.log(`   - ${booksWithTags} books have tags`);
                    console.log(`   - ${booksWithNotes} books have notes`);
                    const sampleTagged = processedBooks.find(b => b.tags && b.tags.length > 0);
                    if (sampleTagged) {
                        console.log(`   - Sample tagged: "${sampleTagged.title}" has tags:`, sampleTagged.tags);
                    }
                    const sampleNoted = processedBooks.find(b => b.userNote);
                    if (sampleNoted) {
                        console.log(`   - Sample noted: "${sampleNoted.title}" has note:`, sampleNoted.userNote);
                    }
                }

                // Save to IndexedDB (returns merged books including preserved orphan wishlists)
                // v5.0.0-alpha.173.1 - Pass preserveUserData=true for imports to merge with existing
                const mergedBooks = await saveBooksToIndexedDB(processedBooks, true);
                setBooks(mergedBooks);

                // v5.0.0-alpha.126: When restoring backup, trigger download of amazon-library.json
                // This ensures future fetcher runs can update all books (fixes orphaned wishlist data hole)
                if (organizationFromFile !== null) {
                    // Build amazon-library.json format from restored books
                    const libraryData = {
                        schemaVersion: "2.3",
                        books: {
                            fetchDate: metadata.fetchDate || new Date().toISOString(),
                            fetcherVersion: metadata.fetcherVersion || "backup-restore",
                            totalBooks: mergedBooks.length,
                            items: mergedBooks.map(book => ({
                                asin: book.asin,
                                onWishlist: book.onWishlist || false,
                                ownershipType: book.ownershipType || 'purchased',
                                isHidden: book.isHidden || false,
                                addedToWishlist: book.addedToWishlist || '',
                                title: book.title,
                                authors: book.author,
                                coverUrl: book.coverUrl,
                                rating: book.rating,
                                reviewCount: book.ratingCount,
                                series: book.series,
                                seriesPosition: book.seriesPosition,
                                acquisitionDate: book.acquired,
                                description: book.description,
                                topReviews: book.topReviews,
                                binding: book.binding,
                                currentPrice: book.currentPrice,
                                listPrice: book.listPrice,
                                priceFetchedAt: book.priceFetchedAt,
                                targetPrice: book.targetPrice,
                                priceTrigger: book.priceTrigger,
                                genres: book.genres
                            }))
                        }
                    };

                    // Add collections if available
                    if (collections && collections.size > 0) {
                        const collectionItems = mergedBooks
                            .filter(book => book.collections || book.readStatus)
                            .map(book => ({
                                asin: book.asin,
                                readStatus: book.readStatus || 'UNKNOWN',
                                collections: book.collections || []
                            }));

                        libraryData.collections = {
                            fetchDate: parsedData.collections?.fetchDate || new Date().toISOString(),
                            fetcherVersion: parsedData.collections?.fetcherVersion || "backup-restore",
                            totalBooksScanned: collectionItems.length,
                            booksWithCollections: collectionItems.filter(b => b.collections.length > 0).length,
                            items: collectionItems
                        };
                    }

                    // v5.0.9 - Show custom restore completion dialog
                    const shouldSave = await showBackupRestoredDialog(mergedBooks.length);

                    // Only trigger download if user clicked "Save File"
                    if (shouldSave) {
                        const blob = new Blob([JSON.stringify(libraryData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'amazon-library.json';
                        a.click();
                        URL.revokeObjectURL(url);
                    } else {
                        console.log('⚠️ User cancelled library file download');
                    }

                    // Show helpful guidance (console backup)
                    console.log('\n========================================');
                    console.log('📥 LIBRARY FILE REGENERATED');
                    console.log('========================================');
                    console.log(`   ✅ amazon-library.json (${mergedBooks.length} books)`);
                    console.log('');
                    console.log('👉 Next steps:');
                    console.log('   1. Find amazon-library.json in your Downloads folder');
                    console.log('   2. Keep it somewhere you can find it (Desktop, Documents, etc.)');
                    console.log('   3. Use this file for future Library Fetcher runs');
                    console.log('');
                    console.log('💡 Why this file matters:');
                    console.log('   - Ensures future fetcher runs update ALL your books');
                    console.log('   - Includes wishlist books that may not be in fresh fetches');
                    console.log('   - Prevents stale price data for orphaned wishlist items');
                    console.log('========================================\n');
                }

                // Reset all filters when loading new library (v3.8.0.g, updated v3.8.0.k)
                setSearchTerm('');
                setReadStatusFilter('');
                setCollectionFilter('');
                setRatingFilter('');
                setOwnershipFilter('');
                setSeriesFilter('');
                setDateFrom('');
                setDateTo('');
                setShowHidden(true); // v4.8.0 - Default to showing all books on load
                localStorage.setItem(FILTERS_KEY, JSON.stringify({
                    searchTerm: '',
                    readStatusFilter: '',
                    collectionFilter: '',
                    ratingFilter: '',
                    ownershipFilter: '',
                    seriesFilter: '',
                    dateFrom: '',
                    dateTo: '',
                    showHidden: true // v4.8.0 - Default to showing all books
                }));
                console.log('🔍 Filters cleared for new library');

                // v4.0.0.b: Check organization source - backup file takes priority, then localStorage
                let orgToRestore = null;
                let orgSource = null;

                if (organizationFromFile) {
                    // Backup restore - use organization from file
                    orgToRestore = organizationFromFile;
                    orgSource = 'backup file';
                } else {
                    // Library file - try to restore from localStorage
                    try {
                        const saved = localStorage.getItem(STORAGE_KEY);
                        if (saved) {
                            const state = JSON.parse(saved);
                            if (state.organization?.columns) {
                                orgToRestore = state.organization;
                                orgSource = 'localStorage';
                            }
                        }
                    } catch (e) {
                        console.log('Note: Could not read localStorage organization');
                    }
                }

                if (orgToRestore?.columns) {
                    const restoredColumns = orgToRestore.columns.map(col => ({
                        id: col.id,
                        name: col.name,
                        books: col.bookIds || col.books || col.items || []  // v4.0.0.c: support items from backup export
                    }));

                    // v4.0.0.d: Find new books not in any column and add to Unorganized
                    const allColumnBookIds = new Set(restoredColumns.flatMap(col => col.books));
                    const allLibraryBookIds = processedBooks.map(b => b.id);
                    const orphanedBooks = allLibraryBookIds.filter(id => !allColumnBookIds.has(id));

                    if (orphanedBooks.length > 0) {
                        // Find or create Unorganized column
                        let unorganizedCol = restoredColumns.find(col => col.id === 'unorganized');
                        if (unorganizedCol) {
                            // Prepend new books to Unorganized (newest first)
                            unorganizedCol.books = [...orphanedBooks, ...unorganizedCol.books];
                        } else {
                            // Create Unorganized column with orphaned books
                            restoredColumns.unshift({ id: 'unorganized', name: 'Unorganized', books: orphanedBooks });
                        }
                        console.log(`📚 Added ${orphanedBooks.length} new book${orphanedBooks.length === 1 ? '' : 's'} to Unorganized`);
                    }

                    setColumns(restoredColumns);
                    setBlankImageBooks(new Set(orgToRestore.blankImageBooks || []));
                    setTagRegistry(orgToRestore.tagRegistry || {}); // v5.0.0-alpha.175.17

                    // v5.0.0-alpha.99 - Restore folders from backup (if present)
                    if (orgToRestore.folders && Array.isArray(orgToRestore.folders)) {
                        const restoredFolders = orgToRestore.folders.map(folder => ({
                            id: folder.id,
                            name: folder.name,
                            bookIds: folder.bookIds || [],
                            parentId: folder.parentId,
                            collapsed: folder.collapsed,
                            childFolderIds: folder.childFolderIds
                        }));

                        // Ensure Inbox exists (for backward compatibility with old backups)
                        const hasInbox = restoredFolders.some(f => f.id === '__inbox__');
                        if (!hasInbox) {
                            restoredFolders.push({
                                id: '__inbox__',
                                name: 'Inbox',
                                bookIds: [],
                                parentId: null
                            });
                        }

                        // v5.1.0-alpha.8 - Clean up orphaned bookIds in folders
                        const validBookIds = new Set(processedBooks.map(b => b.id));
                        let totalOrphans = 0;

                        restoredFolders.forEach(folder => {
                            if (folder.bookIds && folder.bookIds.length > 0) {
                                const before = folder.bookIds.length;
                                folder.bookIds = folder.bookIds.filter(id => validBookIds.has(id));
                                const removed = before - folder.bookIds.length;
                                if (removed > 0) {
                                    console.log(`[CLEANUP] Removed ${removed} orphaned bookIds from folder "${folder.name}"`);
                                    totalOrphans += removed;
                                }
                            }
                        });

                        if (totalOrphans > 0) {
                            console.log(`[CLEANUP] Total orphaned bookIds removed: ${totalOrphans}`);
                        }

                        setFolders(restoredFolders);
                        localStorage.setItem(FOLDERS_KEY, JSON.stringify(restoredFolders));
                        console.log(`✅ Restored ${restoredFolders.length} folders from ${orgSource}`);
                    } else {
                        // No folders in backup - preserve existing folders from localStorage (backward compatibility)
                        console.log('📁 No folders in backup - keeping existing folder structure');
                    }

                    // v5.0.0-alpha.101 - Restore Explorer settings from backup (if present)
                    if (orgToRestore.explorerSettings) {
                        const settings = orgToRestore.explorerSettings;
                        // v5.0.2 - viewMode removed (always Explorer mode)
                        if (settings.folderSortSettings) setFolderSortSettings(settings.folderSortSettings);
                        if (settings.explorerView) setExplorerView(settings.explorerView);
                        if (settings.explorerCoverCols) setExplorerCoverCols(settings.explorerCoverCols);
                        if (settings.leftPaneWidth) setLeftPaneWidth(settings.leftPaneWidth);
                        if (settings.visibleColumns) setVisibleColumns(settings.visibleColumns); // v5.0.0-alpha.109
                        // v5.0.3-alpha.1 - Sanitize column widths (filter null values + merge with defaults)
                        if (settings.columnWidths) {
                            const defaultWidths = {
                                title: 200, author: 150, series: 150, seriesNum: 50, rating: 96,
                                myRating: 100, dateAdded: 112, price: 80, priceGoal: 80, delta: 80, amazon: 70
                            };
                            // Iterate over defaults to include new columns
                            const sanitizedWidths = Object.fromEntries(
                                Object.keys(defaultWidths).map(key => [
                                    key,
                                    settings.columnWidths[key] ?? defaultWidths[key]
                                ])
                            );
                            setColumnWidths(sanitizedWidths);
                        }
                        console.log('✅ Restored Explorer view settings from backup');
                    } else {
                        // No explorer settings in backup - preserve existing from localStorage (backward compatibility)
                        console.log('📁 No explorer settings in backup - keeping existing preferences');
                    }

                    console.log(`✅ Restored organization from ${orgSource}`);
                    setDataSource('enriched');
                    setLastSyncTime(Date.now());
                    setSyncStatus('fresh');
                    if (onComplete) setTimeout(() => onComplete(metadata.totalBooks), 0);
                    return;
                }

                // No organization found, start fresh
                setColumns([{ id: 'unorganized', name: 'Unorganized', books: processedBooks.map(b => b.id) }]);
                setDataSource('enriched');
                setLastSyncTime(Date.now());
                setSyncStatus('fresh');
                if (onComplete) setTimeout(() => onComplete(metadata.totalBooks), 0);
            };

            const addColumn = () => {
                const newId = `col-${Date.now()}`;
                setColumns([...columns, { id: newId, name: 'New Column', books: [] }]);
                // Set this column to edit mode immediately
                setTimeout(() => setEditingColumn(newId), 0);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/column-created';
            };

            // v4.12.0 - Insert column before or after a reference column
            const insertColumn = (referenceColumnId, position) => {
                const newId = `col-${Date.now()}`;
                const newColumn = { id: newId, name: 'New Column', books: [] };
                const refIndex = columns.findIndex(c => c.id === referenceColumnId);
                if (refIndex === -1) return;

                const insertIndex = position === 'before' ? refIndex : refIndex + 1;
                const newColumns = [...columns];
                newColumns.splice(insertIndex, 0, newColumn);
                setColumns(newColumns);

                // Set this column to edit mode immediately
                setTimeout(() => setEditingColumn(newId), 0);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/column-created';
            };

            const startEditingColumn = (columnId, currentName) => {
                setEditingColumn(columnId);
                setEditingName(currentName);
            };

            const finishEditingColumn = (columnId) => {
                if (editingName.trim()) {
                    setColumns(columns.map(col =>
                        col.id === columnId ? { ...col, name: editingName.trim() } : col
                    ));
                }
                setEditingColumn(null);
                setEditingName('');
            };

            const sortColumn = (columnId, sortType) => {
                // Check for publication date availability when sorting by published
                if (sortType === 'published-desc' || sortType === 'published-asc') {
                    const column = columns.find(c => c.id === columnId);
                    if (column) {
                        const columnBooks = column.books.map(id => books.find(b => b.id === id)).filter(Boolean);
                        const booksWithPubDate = columnBooks.filter(b => b.publicationDate);
                        if (booksWithPubDate.length === 0) {
                            alert('No publication dates found in this column.\n\nTo add publication dates:\n1. Re-run the Library Fetcher on Amazon\n2. Import the updated library file\n\nYour organization will be preserved - only metadata is updated.');
                            return;
                        }
                    }
                }

                setColumns(columns.map(col => {
                    if (col.id !== columnId) return col;

                    const sortedBookIds = [...col.books].sort((aId, bId) => {
                        const a = books.find(b => b.id === aId);
                        const b = books.find(b => b.id === bId);
                        if (!a || !b) return 0;

                        switch(sortType) {
                            case 'title-asc':
                                return a.title.localeCompare(b.title);
                            case 'title-desc':
                                return b.title.localeCompare(a.title);
                            case 'author-asc':
                                return a.author.localeCompare(b.author);
                            case 'author-desc':
                                return b.author.localeCompare(a.author);
                            case 'rating-desc':
                                return (b.rating || 0) - (a.rating || 0);
                            case 'rating-asc':
                                return (a.rating || 0) - (b.rating || 0);
                            case 'acquired-desc':
                                // v5.0.0-alpha.169.5 - Use parseBookDate for proper date comparison
                                return parseBookDate(b.acquired || b.addedToWishlist) - parseBookDate(a.acquired || a.addedToWishlist);
                            case 'acquired-asc':
                                return parseBookDate(a.acquired || a.addedToWishlist) - parseBookDate(b.acquired || b.addedToWishlist);
                            case 'published-desc':
                                // Books without publication date go to end
                                if (!a.publicationDate && !b.publicationDate) return 0;
                                if (!a.publicationDate) return 1;
                                if (!b.publicationDate) return -1;
                                return b.publicationDate.localeCompare(a.publicationDate);
                            case 'published-asc':
                                // Books without publication date go to end
                                if (!a.publicationDate && !b.publicationDate) return 0;
                                if (!a.publicationDate) return 1;
                                if (!b.publicationDate) return -1;
                                return a.publicationDate.localeCompare(b.publicationDate);
                            case 'series-pos-asc':
                                // v3.11.0.e - Books without series go to end, books with series but no position go last in their series
                                const aHasSeriesAsc = a.series;
                                const bHasSeriesAsc = b.series;

                                if (!aHasSeriesAsc && !bHasSeriesAsc) return 0; // Both have no series, keep original order
                                if (!aHasSeriesAsc) return 1; // a has no series, goes after b
                                if (!bHasSeriesAsc) return -1; // b has no series, goes after a

                                // Primary sort: group by series name (alphabetical)
                                const seriesCompareAsc = a.series.localeCompare(b.series);
                                if (seriesCompareAsc !== 0) return seriesCompareAsc;

                                // Secondary sort: position within same series (books without position go last)
                                return (parseInt(a.seriesPosition) || 999) - (parseInt(b.seriesPosition) || 999);
                            case 'series-pos-desc':
                                // v3.11.0.e - Books without series go to end, books with series but no position go last in their series
                                const aHasSeriesDesc = a.series;
                                const bHasSeriesDesc = b.series;

                                if (!aHasSeriesDesc && !bHasSeriesDesc) return 0; // Both have no series, keep original order
                                if (!aHasSeriesDesc) return 1; // a has no series, goes after b
                                if (!bHasSeriesDesc) return -1; // b has no series, goes after a

                                // Primary sort: group by series name (alphabetical)
                                const seriesCompareDesc = a.series.localeCompare(b.series);
                                if (seriesCompareDesc !== 0) return seriesCompareDesc;

                                // Secondary sort: position within same series (REVERSED, books without position go last)
                                return (parseInt(b.seriesPosition) || 999) - (parseInt(a.seriesPosition) || 999);
                            default:
                                return 0;
                        }
                    });

                    return { ...col, books: sortedBookIds };
                }));
                setSortMenuOpen(null);
                setColumnMenuOpen(null); // v3.11.0 - Also close parent menu
            };

            const checkIfBlankImage = (img, bookId) => {
                if (img.naturalWidth === 1 && img.naturalHeight === 1) {
                    setBlankImageBooks(prev => new Set([...prev, bookId]));
                }
            };

            const openDeleteDialog = (columnId) => {
                const col = columns.find(c => c.id === columnId);

                if (col && col.books.length === 0) {
                    // v4.8.0 - Record action for undo (empty column)
                    const columnIndex = columns.findIndex(c => c.id === columnId);
                    recordAction({
                        type: 'DELETE_COLUMN',
                        columnId: col.id,
                        columnName: col.name,
                        columnIndex: columnIndex,
                        books: [],
                        destinationColId: null
                    });
                    setColumns(columns.filter(c => c.id !== columnId));
                    return;
                }

                const otherColumns = columns.filter(c => c.id !== columnId);
                if (otherColumns.length > 0) {
                    setDeleteDialogOpen(columnId);
                    setDeleteDestination(otherColumns[0].id);
                }
            };

            const confirmDeleteColumn = () => {
                const columnToDelete = columns.find(c => c.id === deleteDialogOpen);
                const destinationColumn = columns.find(c => c.id === deleteDestination);

                if (!columnToDelete || !destinationColumn) return;

                // v4.8.0 - Record action for undo (column with books)
                const columnIndex = columns.findIndex(c => c.id === deleteDialogOpen);
                recordAction({
                    type: 'DELETE_COLUMN',
                    columnId: columnToDelete.id,
                    columnName: columnToDelete.name,
                    columnIndex: columnIndex,
                    books: [...columnToDelete.books],
                    destinationColId: deleteDestination
                });

                setColumns(columns.filter(c => c.id !== deleteDialogOpen).map(c =>
                    c.id === deleteDestination ? { ...c, books: [...c.books, ...columnToDelete.books] } : c
                ));

                setDeleteDialogOpen(null);
                setDeleteDestination('');
            };

            // v3.11.0 - Divider Functions
            const insertDivider = (columnId) => {
                if (!newDividerLabel.trim()) return;

                const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const divider = {
                    type: 'divider',
                    id: dividerId,
                    label: newDividerLabel.trim()
                };

                setColumns(columns.map(col => {
                    if (col.id !== columnId) return col;

                    // Find insertion position: before first selected book, or at top if no selection
                    let insertIndex = 0; // Default to top
                    if (selectedBooks.size > 0) {
                        // Find first selected book in this column
                        // v4.16.0.d - Check composite keys with indices for this column
                        let minIndex = Infinity;
                        for (const key of selectedBooks) {
                            const [keyColumnId, bookId, indexStr] = key.split(':');
                            if (keyColumnId === columnId) {
                                const index = parseInt(indexStr, 10);
                                if (index < minIndex) {
                                    minIndex = index;
                                }
                            }
                        }
                        if (minIndex !== Infinity) {
                            insertIndex = minIndex;
                        }
                    }

                    const newBooks = [...col.books];
                    newBooks.splice(insertIndex, 0, divider);
                    return { ...col, books: newBooks };
                }));

                setInsertDividerOpen(null);
                setNewDividerLabel('');
                setColumnMenuOpen(null);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/divider-created';
            };

            const startEditingDivider = (columnId, dividerId, currentLabel) => {
                setEditingDivider({ columnId, dividerId });
                setEditingDividerLabel(currentLabel);
            };

            const finishEditingDivider = () => {
                if (!editingDivider) return;

                const { columnId, dividerId } = editingDivider;
                const newLabel = editingDividerLabel.trim();

                if (!newLabel) {
                    setEditingDivider(null);
                    setEditingDividerLabel('');
                    return;
                }

                setColumns(columns.map(col =>
                    col.id === columnId
                        ? {
                            ...col,
                            books: col.books.map(item =>
                                (typeof item === 'object' && item.type === 'divider' && item.id === dividerId)
                                    ? { ...item, label: newLabel }
                                    : item
                            )
                        }
                        : col
                ));

                setEditingDivider(null);
                setEditingDividerLabel('');
            };

            const deleteDivider = (columnId, dividerId) => {
                // v4.8.0 - Capture divider info for undo before deleting
                const col = columns.find(c => c.id === columnId);
                const dividerIndex = col.books.findIndex(item =>
                    typeof item === 'object' && item.type === 'divider' && item.id === dividerId
                );
                const dividerObj = col.books[dividerIndex];

                setColumns(columns.map(c =>
                    c.id === columnId
                        ? {
                            ...c,
                            books: c.books.filter(item =>
                                !(typeof item === 'object' && item.type === 'divider' && item.id === dividerId)
                            )
                        }
                        : c
                ));

                // v4.8.0 - Record action for undo
                if (dividerObj) {
                    recordAction({
                        type: 'DELETE_DIVIDER',
                        columnId: columnId,
                        divider: { ...dividerObj },
                        dividerIndex: dividerIndex
                    });
                }
            };

            const autoDivideBySeries = (columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return;

                // Get actual book objects (not dividers)
                const bookItems = column.books.filter(item => typeof item === 'string');
                const bookObjects = bookItems.map(id => books.find(b => b.id === id)).filter(Boolean);

                if (bookObjects.length === 0) return;

                // Group books by series (books without series stay at end)
                const seriesGroups = {};
                const noSeriesBooks = [];

                bookObjects.forEach(book => {
                    if (book.series) {
                        if (!seriesGroups[book.series]) {
                            seriesGroups[book.series] = [];
                        }
                        seriesGroups[book.series].push(book.id);
                    } else {
                        noSeriesBooks.push(book.id);
                    }
                });

                // Sort series names alphabetically
                const sortedSeriesNames = Object.keys(seriesGroups).sort((a, b) => a.localeCompare(b));

                // v3.11.0.f - Sort books within each series by position
                sortedSeriesNames.forEach(seriesName => {
                    const bookIds = seriesGroups[seriesName];
                    const seriesBookObjects = bookIds.map(id => books.find(b => b.id === id)).filter(Boolean);

                    // Sort by seriesPosition (books without position go last)
                    seriesBookObjects.sort((a, b) => {
                        return (parseInt(a.seriesPosition) || 999) - (parseInt(b.seriesPosition) || 999);
                    });

                    // Update the group with sorted IDs
                    seriesGroups[seriesName] = seriesBookObjects.map(book => book.id);
                });

                // Build new books array with dividers
                const newBooks = [];
                sortedSeriesNames.forEach(seriesName => {
                    const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    newBooks.push({
                        type: 'divider',
                        id: dividerId,
                        label: seriesName
                    });
                    newBooks.push(...seriesGroups[seriesName]);
                });

                // v3.11.0.e - Add "Miscellaneous" divider for books without series
                if (noSeriesBooks.length > 0) {
                    const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    newBooks.push({
                        type: 'divider',
                        id: dividerId,
                        label: 'Miscellaneous'
                    });
                    newBooks.push(...noSeriesBooks);
                }

                setColumns(columns.map(col =>
                    col.id === columnId ? { ...col, books: newBooks } : col
                ));

                setColumnMenuOpen(null);
                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/auto-divide-by-series';
            };

            const autoDivideByRating = (columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return;

                // Get actual book objects (not dividers)
                const bookItems = column.books.filter(item => typeof item === 'string');
                const bookObjects = bookItems.map(id => books.find(b => b.id === id)).filter(Boolean);

                if (bookObjects.length === 0) return;

                // Group books by rating tier
                const ratingTiers = {
                    '5 Stars': [],
                    '4 Stars': [],
                    '3 Stars': [],
                    '2 Stars': [],
                    '1 Star': [],
                    'No Rating': []
                };

                bookObjects.forEach(book => {
                    if (!book.rating || book.rating === 0) {
                        ratingTiers['No Rating'].push(book.id);
                    } else if (book.rating >= 4.5) {
                        ratingTiers['5 Stars'].push(book.id);
                    } else if (book.rating >= 3.5) {
                        ratingTiers['4 Stars'].push(book.id);
                    } else if (book.rating >= 2.5) {
                        ratingTiers['3 Stars'].push(book.id);
                    } else if (book.rating >= 1.5) {
                        ratingTiers['2 Stars'].push(book.id);
                    } else {
                        ratingTiers['1 Star'].push(book.id);
                    }
                });

                // Build new books array with dividers (only for non-empty tiers)
                const tierOrder = ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star', 'No Rating'];
                const newBooks = [];

                tierOrder.forEach(tier => {
                    if (ratingTiers[tier].length > 0) {
                        const dividerId = `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        newBooks.push({
                            type: 'divider',
                            id: dividerId,
                            label: tier
                        });
                        newBooks.push(...ratingTiers[tier]);
                    }
                });

                setColumns(columns.map(col =>
                    col.id === columnId ? { ...col, books: newBooks } : col
                ));

                setColumnMenuOpen(null);
            };

            const openBookModal = (book, columnId) => {
                try {
                    const cache = localStorage.getItem(CACHE_KEY);
                    if (cache) {
                        const cacheData = JSON.parse(cache);
                        if (cacheData[book.asin]) {
                            const cached = cacheData[book.asin];
                            book = {
                                ...book,
                                description: cached.description || book.description,
                                rating: cached.rating || book.rating,
                                ratingCount: cached.ratingCount || book.ratingCount,
                                topReviews: cached.topReviews || book.topReviews
                            };
                        }
                    }
                } catch (e) {
                    console.error('Cache read error:', e);
                }

                setModalBook(book);
                setModalColumnId(columnId);
                setShowAllReviews(false);
            };

            const closeBookModal = () => {
                setModalBook(null);
                setModalColumnId(null);
                setIsEditingNote(false); // v4.21.0.a - reset note editor state
                // v4.27.0 - reset tag input state
                if (contextSubmenu === 'addTagModal') setContextSubmenu(null);
                setTagInputValue('');
                setNoteEditContent(''); // v4.21.0.a
            };

            // Multi-select helper functions
            // v4.16.0.c - Selection now uses composite keys "columnId:bookId:index" to support selecting individual instances
            // v4.16.0.d - Added index to support multiple copies of same book in same column
            const toggleBookSelection = (bookId, columnId, index) => {
                const key = `${columnId}:${bookId}:${index}`;
                setSelectedBooks(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(key)) {
                        newSet.delete(key);
                    } else {
                        newSet.add(key);
                    }
                    return newSet;
                });
            };

            // v4.19.1 - Now includes dividers in range selection
            const selectBookRange = (startBookId, endBookId, columnId, startIndex, endIndex) => {
                // Only select within the same column
                const column = columns.find(col => col.id === columnId);
                if (!column) return;

                // Use raw indices directly - simpler and works with dividers
                const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];

                // Build composite keys for all items in range (books AND dividers)
                const rangeKeys = [];
                for (let i = min; i <= max; i++) {
                    const item = column.books[i];
                    if (!item) continue;

                    if (typeof item === 'object' && item.type === 'divider') {
                        // Divider: use special key format
                        rangeKeys.push(`${columnId}:divider:${item.id}:${i}`);
                    } else {
                        // Book: use standard composite key
                        const bookId = getBookIdFromEntry(item);
                        if (bookId) rangeKeys.push(`${columnId}:${bookId}:${i}`);
                    }
                }

                setSelectedBooks(new Set(rangeKeys));

                // Also set selectedDivider if any dividers are in range (for visual consistency)
                const firstDividerInRange = column.books.slice(min, max + 1).find(
                    item => typeof item === 'object' && item.type === 'divider'
                );
                if (firstDividerInRange) {
                    setSelectedDivider({ columnId, dividerId: firstDividerInRange.id });
                }
            };

            const clearSelection = () => {
                setSelectedBooks(new Set());
                setLastClickedBook(null);
                setSelectedDivider(null); // v3.13.0 - Clear divider selection too
            };

            // v4.16.0.c - Helper to get book IDs from composite selection keys
            const getSelectedBookIds = () => {
                return Array.from(selectedBooks).map(key => key.split(':')[1]);
            };

            // v4.16.0.c - Helper to get book objects from composite selection keys
            const getSelectedBooksList = () => {
                return getSelectedBookIds().map(id => books.find(b => b.id === id)).filter(Boolean);
            };

            // v4.16.0.w - Helper to get full entry info from composite selection keys
            // Returns array of {columnId, index, entry, bookId, instanceId} for each selection
            const getSelectedEntries = () => {
                return Array.from(selectedBooks).map(key => {
                    const [columnId, bookId, indexStr] = key.split(':');
                    const index = parseInt(indexStr, 10);
                    const column = columns.find(c => c.id === columnId);
                    if (!column) return null;
                    const entry = column.books[index];
                    if (!entry) return null;
                    return {
                        columnId,
                        index,
                        entry,
                        bookId: getBookIdFromEntry(entry),
                        instanceId: getInstanceId(entry)
                    };
                }).filter(Boolean);
            };

            // v4.8.0 - Undo/Redo core functions
            const MAX_UNDO = 50;

            // Keep refs in sync with state (fixes stale closure in keyboard handler)
            useEffect(() => {
                undoStackRef.current = undoStack;
            }, [undoStack]);
            useEffect(() => {
                redoStackRef.current = redoStack;
            }, [redoStack]);
            useEffect(() => {
                modalBookRef.current = modalBook;
            }, [modalBook]);

            const recordAction = (action) => {
                setUndoStack(prev => {
                    const newStack = [...prev, { ...action, timestamp: Date.now() }];
                    if (newStack.length > MAX_UNDO) newStack.shift();
                    return newStack;
                });
                setRedoStack([]); // Clear redo on new action
            };

            // TODO - Delete verbose console.log statements in executeUndo/executeRedo before release
            const executeUndo = (action) => {
                switch (action.type) {
                    case 'MOVE_BOOKS':
                        // Move books back to source column at original positions
                        console.log('[UNDO MOVE_BOOKS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            console.log('[UNDO MOVE_BOOKS] Processing columns...');
                            // v4.16.0.aj - Use entries if available, fallback to bookIds for legacy actions
                            const entriesToRestore = action.entries || action.bookIds;
                            return cols.map(col => {
                                if (col.id === action.toColId) {
                                    // v4.16.0.aj - Remove from target by matching entries or bookIds
                                    const beforeCount = col.books.length;
                                    let filtered;
                                    if (action.entries) {
                                        // New format: remove specific entries by instanceId or exact match
                                        const instanceIdsToRemove = new Set(
                                            action.entries
                                                .filter(e => e && typeof e === 'object' && e.instanceId)
                                                .map(e => e.instanceId)
                                        );
                                        const bookIdsToRemove = action.entries
                                            .filter(e => typeof e === 'string')
                                            .concat(action.entries.filter(e => e && typeof e === 'object' && !e.instanceId).map(e => e.bookId || e));
                                        filtered = col.books.filter(entry => {
                                            if (typeof entry === 'object' && entry.instanceId) {
                                                return !instanceIdsToRemove.has(entry.instanceId);
                                            }
                                            const entryBookId = getBookIdFromEntry(entry);
                                            return !bookIdsToRemove.includes(entryBookId);
                                        });
                                    } else {
                                        // Legacy format: filter by bookId
                                        filtered = col.books.filter(entry => {
                                            const entryBookId = getBookIdFromEntry(entry);
                                            return !action.bookIds.includes(entryBookId);
                                        });
                                    }
                                    console.log(`[UNDO MOVE_BOOKS] Target col "${col.name}": ${beforeCount} -> ${filtered.length} books (removed ${beforeCount - filtered.length})`);
                                    return { ...col, books: filtered };
                                }
                                if (col.id === action.fromColId) {
                                    // Re-insert entries at original positions
                                    const newBooks = [...col.books];
                                    console.log(`[UNDO MOVE_BOOKS] Source col "${col.name}" before insert: ${newBooks.length} books`);
                                    console.log(`[UNDO MOVE_BOOKS] Entries to insert: ${entriesToRestore.length}, at indices: ${action.fromIndices}`);
                                    // v4.16.0.aj - Sort by fromIndices ascending, use actual entries
                                    const sortedPairs = entriesToRestore
                                        .map((entry, i) => ({ entry, index: action.fromIndices[i] }))
                                        .sort((a, b) => a.index - b.index);
                                    console.log('[UNDO MOVE_BOOKS] Sorted pairs count:', sortedPairs.length);
                                    sortedPairs.forEach(({ entry, index }) => {
                                        console.log(`[UNDO MOVE_BOOKS] Splicing entry at index ${index}, array length: ${newBooks.length}`);
                                        newBooks.splice(index, 0, entry);
                                    });
                                    console.log(`[UNDO MOVE_BOOKS] Source col "${col.name}" after insert: ${newBooks.length} books`);
                                    return { ...col, books: newBooks };
                                }
                                return col;
                            });
                        });
                        break;
                    case 'COPY_BOOKS':
                        // v4.16.0.au - Undo copy: just remove the copied entries from target column
                        console.log('[UNDO COPY_BOOKS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            return cols.map(col => {
                                if (col.id === action.toColId) {
                                    const instanceIdsToRemove = new Set(
                                        action.entries
                                            .filter(e => e && typeof e === 'object' && e.instanceId)
                                            .map(e => e.instanceId)
                                    );
                                    const filtered = col.books.filter(entry => {
                                        if (typeof entry === 'object' && entry.instanceId) {
                                            return !instanceIdsToRemove.has(entry.instanceId);
                                        }
                                        return true;
                                    });
                                    console.log(`[UNDO COPY_BOOKS] Removed ${col.books.length - filtered.length} copied entries from "${col.name}"`);
                                    return { ...col, books: filtered };
                                }
                                return col;
                            });
                        });
                        break;
                    case 'REORDER_BOOKS':
                        // Move books back to original positions within same column
                        console.log('[UNDO REORDER_BOOKS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            console.log('[UNDO REORDER_BOOKS] Processing columns...');
                            // v4.16.0.aj - Use entries if available, fallback to bookIds for legacy actions
                            const entriesToRestore = action.entries || action.bookIds;
                            return cols.map(col => {
                                if (col.id === action.colId) {
                                    const newBooks = [...col.books];
                                    console.log(`[UNDO REORDER_BOOKS] Col "${col.name}" before: ${newBooks.length} books`);
                                    // v4.16.0.aj - Remove entries by instanceId or bookId
                                    if (action.entries) {
                                        // New format: find and remove specific entries
                                        action.entries.forEach(entry => {
                                            let idx = -1;
                                            if (typeof entry === 'object' && entry.instanceId) {
                                                idx = newBooks.findIndex(e => e && typeof e === 'object' && e.instanceId === entry.instanceId);
                                            } else {
                                                const bookId = getBookIdFromEntry(entry);
                                                idx = newBooks.findIndex(e => getBookIdFromEntry(e) === bookId);
                                            }
                                            if (idx !== -1) newBooks.splice(idx, 1);
                                        });
                                    } else {
                                        // Legacy format: remove by bookId
                                        action.bookIds.forEach(bookId => {
                                            const idx = newBooks.findIndex(e => getBookIdFromEntry(e) === bookId);
                                            if (idx !== -1) newBooks.splice(idx, 1);
                                        });
                                    }
                                    console.log(`[UNDO REORDER_BOOKS] After removal: ${newBooks.length} books`);
                                    // Then insert them back at their original positions (sorted ascending)
                                    // v4.16.0.aj - Use actual entries instead of bookIds
                                    const sortedPairs = entriesToRestore
                                        .map((entry, i) => ({ entry, index: action.fromIndices[i] }))
                                        .sort((a, b) => a.index - b.index);
                                    console.log('[UNDO REORDER_BOOKS] Sorted pairs count:', sortedPairs.length);
                                    sortedPairs.forEach(({ entry, index }) => {
                                        console.log(`[UNDO REORDER_BOOKS] Splicing entry at index ${index}, array length: ${newBooks.length}`);
                                        newBooks.splice(index, 0, entry);
                                    });
                                    console.log(`[UNDO REORDER_BOOKS] After insert: ${newBooks.length} books`);
                                    return { ...col, books: newBooks };
                                }
                                return col;
                            });
                        });
                        break;
                    case 'TOGGLE_HIDE':
                        // v4.8.0 - Restore each book's previous hidden state
                        console.log('[UNDO TOGGLE_HIDE] Action:', JSON.stringify(action, null, 2));
                        setBooks(prevBooks => {
                            const updatedBooks = prevBooks.map(book => {
                                if (action.bookIds.includes(book.id)) {
                                    const prevState = action.previousStates[book.id];
                                    console.log(`[UNDO TOGGLE_HIDE] Restoring "${book.title}" isHidden: ${book.isHidden} -> ${prevState}`);
                                    return { ...book, isHidden: prevState };
                                }
                                return book;
                            });
                            saveBooksToIndexedDB(updatedBooks);
                            return updatedBooks;
                        });
                        break;
                    case 'DELETE_COLUMN':
                        // v4.8.0 - Restore deleted column with its books
                        console.log('[UNDO DELETE_COLUMN] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            // Remove books from destination column (if any were moved)
                            let updatedCols = cols;
                            if (action.books.length > 0 && action.destinationColId) {
                                updatedCols = cols.map(col => {
                                    if (col.id === action.destinationColId) {
                                        return { ...col, books: col.books.filter(id => !action.books.includes(id)) };
                                    }
                                    return col;
                                });
                            }
                            // Re-insert the column at its original position
                            const restoredColumn = {
                                id: action.columnId,
                                name: action.columnName,
                                books: [...action.books]
                            };
                            const newCols = [...updatedCols];
                            newCols.splice(action.columnIndex, 0, restoredColumn);
                            console.log(`[UNDO DELETE_COLUMN] Restored column "${action.columnName}" at index ${action.columnIndex} with ${action.books.length} books`);
                            return newCols;
                        });
                        break;
                    case 'REORDER_COLUMNS':
                        // v4.8.0 - Move column back to original position
                        console.log('[UNDO REORDER_COLUMNS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            const currentIndex = cols.findIndex(c => c.id === action.columnId);
                            if (currentIndex === -1) return cols;
                            const newCols = [...cols];
                            const [movedColumn] = newCols.splice(currentIndex, 1);
                            newCols.splice(action.fromIndex, 0, movedColumn);
                            console.log(`[UNDO REORDER_COLUMNS] Moved column from index ${currentIndex} back to ${action.fromIndex}`);
                            return newCols;
                        });
                        break;
                    case 'DELETE_DIVIDER':
                        // v4.8.0 - Restore deleted divider at original position
                        console.log('[UNDO DELETE_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.columnId) {
                                const newBooks = [...col.books];
                                newBooks.splice(action.dividerIndex, 0, { ...action.divider });
                                console.log(`[UNDO DELETE_DIVIDER] Restored divider "${action.divider.label}" at index ${action.dividerIndex}`);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'REORDER_DIVIDER':
                        // v4.8.0 - Move divider back to original position
                        console.log('[UNDO REORDER_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.colId) {
                                const newBooks = [...col.books];
                                // Find and remove divider from current position
                                const currentIdx = newBooks.findIndex(b =>
                                    typeof b === 'object' && b.type === 'divider' && b.id === action.dividerId
                                );
                                if (currentIdx === -1) return col;
                                const [divider] = newBooks.splice(currentIdx, 1);
                                // Insert at original position
                                newBooks.splice(action.fromIndex, 0, divider);
                                console.log(`[UNDO REORDER_DIVIDER] Moved divider "${action.dividerLabel}" from index ${currentIdx} back to ${action.fromIndex}`);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    // v5.0.0-alpha.46 - Explorer folder operations
                    case 'MOVE_BOOKS_FOLDER':
                        // Undo move: remove from target folder, add back to source folder
                        console.log('[UNDO MOVE_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.toFolderId) {
                                // Remove books from target
                                return { ...folder, bookIds: (folder.bookIds || []).filter(id => !action.bookIds.includes(id)) };
                            }
                            if (folder.id === action.fromFolderId) {
                                // Re-insert at original positions
                                const newBookIds = [...(folder.bookIds || [])];
                                const sortedPairs = action.bookIds
                                    .map((id, i) => ({ id, index: action.fromIndices[i] }))
                                    .sort((a, b) => a.index - b.index);
                                sortedPairs.forEach(({ id, index }) => {
                                    newBookIds.splice(index, 0, id);
                                });
                                return { ...folder, bookIds: newBookIds };
                            }
                            return folder;
                        }));
                        break;
                    case 'COPY_BOOKS_FOLDER':
                        // Undo copy: just remove from target folder
                        console.log('[UNDO COPY_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.toFolderId) {
                                return { ...folder, bookIds: (folder.bookIds || []).filter(id => !action.bookIds.includes(id)) };
                            }
                            return folder;
                        }));
                        break;
                    case 'REMOVE_BOOKS_FOLDER':
                        // Undo remove: add books back to folder at original positions
                        console.log('[UNDO REMOVE_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                const newBookIds = [...(folder.bookIds || [])];
                                const sortedPairs = action.bookIds
                                    .map((id, i) => ({ id, index: action.fromIndices[i] }))
                                    .sort((a, b) => a.index - b.index);
                                sortedPairs.forEach(({ id, index }) => {
                                    newBookIds.splice(index, 0, id);
                                });
                                return { ...folder, bookIds: newBookIds };
                            }
                            return folder;
                        }));
                        break;
                    case 'REORDER_BOOKS_FOLDER':
                        // Undo reorder: restore original positions
                        console.log('[UNDO REORDER_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                const newBookIds = [...(folder.bookIds || [])];
                                // Remove the moved books
                                action.bookIds.forEach(id => {
                                    const idx = newBookIds.indexOf(id);
                                    if (idx !== -1) newBookIds.splice(idx, 1);
                                });
                                // Re-insert at original positions (sorted ascending)
                                const sortedPairs = action.bookIds
                                    .map((id, i) => ({ id, index: action.fromIndices[i] }))
                                    .sort((a, b) => a.index - b.index);
                                sortedPairs.forEach(({ id, index }) => {
                                    newBookIds.splice(index, 0, id);
                                });
                                return { ...folder, bookIds: newBookIds };
                            }
                            return folder;
                        }));
                        break;
                    case 'DELETE_FOLDERS':
                        // Undo delete: restore folders with their bookIds and hierarchy
                        // v5.0.0-alpha.56 - Also remove orphaned books from destination and restore selection
                        console.log('[UNDO DELETE_FOLDERS] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => {
                            let newFolders = [...prev];

                            // Remove orphaned books from destination folder (if any were moved)
                            if (action.orphanedBooks?.length > 0 && action.orphanDestination) {
                                const orphanedSet = new Set(action.orphanedBooks);
                                newFolders = newFolders.map(f => {
                                    if (f.id === action.orphanDestination) {
                                        return { ...f, bookIds: (f.bookIds || []).filter(id => !orphanedSet.has(id)) };
                                    }
                                    return f;
                                });
                            }

                            // Re-insert folders at their original indices (sorted ascending)
                            const sortedFolders = action.deletedFolders
                                .map((f, i) => ({ folder: f, index: action.folderIndices[i] }))
                                .sort((a, b) => a.index - b.index);
                            sortedFolders.forEach(({ folder, index }) => {
                                newFolders.splice(index, 0, folder);
                            });
                            return newFolders;
                        });
                        // Restore selection to first restored folder
                        if (action.deletedFolders?.length > 0) {
                            setSelectedFolderId(action.deletedFolders[0].id);
                        }
                        break;
                    case 'CREATE_FOLDER':
                        // v5.0.0-alpha.51 - Undo folder creation: remove the created folder
                        console.log('[UNDO CREATE_FOLDER] Removing folder:', action.folderId);
                        setFolders(prev => prev.filter(f => f.id !== action.folderId));
                        if (selectedFolderId === action.folderId) {
                            setSelectedFolderId(action.parentId || '__all__');
                        }
                        break;
                    case 'REPARENT_FOLDER':
                        // v5.0.0-alpha.78 - Undo reparent: restore old parentIds
                        console.log('[UNDO REPARENT_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            const oldData = action.oldParentIds.find(o => o.folderId === folder.id);
                            if (oldData) {
                                return { ...folder, parentId: oldData.oldParentId };
                            }
                            return folder;
                        }));
                        showToast(`Undo: ${action.description}`, 'info');
                        break;
                    case 'MOVE_FOLDER':
                        // v5.0.0-alpha.135 - Undo single folder move: restore old parent
                        console.log('[UNDO MOVE_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                return { ...folder, parentId: action.oldParentId };
                            }
                            return folder;
                        }));
                        break;
                    case 'CUT_PASTE_FOLDER':
                        // v5.0.0-alpha.141 - Undo cut/paste: restore old parent
                        console.log('[UNDO CUT_PASTE_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                return { ...folder, parentId: action.oldParentId };
                            }
                            return folder;
                        }));
                        break;
                    case 'COPY_PASTE_FOLDER':
                        // v5.0.0-alpha.141 - Undo copy/paste: delete copied folders
                        console.log('[UNDO COPY_PASTE_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.filter(folder => !action.newFolderIds.includes(folder.id)));
                        break;
                    case 'MOVE_BOOKS_TO_FOLDER':
                        // v5.0.0-alpha.166 - Undo book move: restore books to original folder
                        console.log('[UNDO MOVE_BOOKS_TO_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.fromFolderId) {
                                // Add books back to source folder (at top)
                                return { ...folder, bookIds: [...action.bookIds, ...folder.bookIds] };
                            }
                            if (folder.id === action.toFolderId) {
                                // Remove books from target folder
                                return { ...folder, bookIds: folder.bookIds.filter(id => !action.bookIds.includes(id)) };
                            }
                            return folder;
                        }));
                        break;
                    case 'COPY_BOOKS_TO_FOLDER':
                        // v5.0.0-alpha.166 - Undo book copy: remove books from target folder
                        console.log('[UNDO COPY_BOOKS_TO_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.toFolderId) {
                                // Remove books from target folder
                                return { ...folder, bookIds: folder.bookIds.filter(id => !action.bookIds.includes(id)) };
                            }
                            return folder;
                        }));
                        break;
                    case 'PASTE_BOOKS_CUT':
                        // v5.0.0-alpha.168 - Undo cut-paste: restore books to source folders, remove from target
                        console.log('[UNDO PASTE_BOOKS_CUT] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => {
                            // Group books by source folder
                            const sourcesByFolder = {};
                            action.sourcePositions.forEach(pos => {
                                if (!sourcesByFolder[pos.folderId]) sourcesByFolder[pos.folderId] = [];
                                sourcesByFolder[pos.folderId].push(pos.bookId);
                            });

                            return prev.map(folder => {
                                // Add books back to source folders
                                if (sourcesByFolder[folder.id]) {
                                    return { ...folder, bookIds: [...sourcesByFolder[folder.id], ...folder.bookIds] };
                                }
                                // Remove books from target folder
                                if (folder.id === action.targetFolderId) {
                                    return { ...folder, bookIds: folder.bookIds.filter(id => !action.bookIds.includes(id)) };
                                }
                                return folder;
                            });
                        });
                        break;
                    case 'PASTE_BOOKS_COPY':
                        // v5.0.0-alpha.168 - Undo copy-paste: remove books from target folder
                        console.log('[UNDO PASTE_BOOKS_COPY] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.targetFolderId) {
                                return { ...folder, bookIds: folder.bookIds.filter(id => !action.bookIds.includes(id)) };
                            }
                            return folder;
                        }));
                        break;
                    case 'REORDER_FOLDER':
                        // v5.0.0-alpha.79 - Undo folder reorder: restore old order
                        console.log('[UNDO REORDER_FOLDER] Action:', JSON.stringify(action, null, 2));
                        if (action.parentId) {
                            setFolders(prev => prev.map(folder => {
                                if (folder.id === action.parentId) {
                                    return { ...folder, childFolderIds: action.oldOrder };
                                }
                                return folder;
                            }));
                        } else {
                            // Root level - restore sortIndex
                            setFolders(prev => {
                                const updated = [...prev];
                                action.oldOrder.forEach((folderId, idx) => {
                                    const folderIdx = updated.findIndex(f => f.id === folderId);
                                    if (folderIdx >= 0) {
                                        updated[folderIdx] = { ...updated[folderIdx], sortIndex: idx };
                                    }
                                });
                                return updated;
                            });
                        }
                        showToast(`Undo: ${action.description}`, 'info');
                        break;
                    default:
                        console.warn('Unknown action type for undo:', action.type);
                }
            };

            const executeRedo = (action) => {
                switch (action.type) {
                    case 'MOVE_BOOKS':
                        // v4.16.0.ak - Move books to target column (use entries for GUID support)
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.fromColId) {
                                // v4.16.0.ak - Remove by instanceId if entries available, else by bookId
                                if (action.entries) {
                                    const instanceIdsToRemove = new Set(
                                        action.entries
                                            .filter(e => e && typeof e === 'object' && e.instanceId)
                                            .map(e => e.instanceId)
                                    );
                                    const bookIdsToRemove = new Set(
                                        action.entries
                                            .filter(e => typeof e === 'string')
                                            .concat(action.entries.filter(e => e && typeof e === 'object' && !e.instanceId).map(e => e.bookId || e))
                                    );
                                    return { ...col, books: col.books.filter((entry, idx) => {
                                        if (typeof entry === 'object' && entry.instanceId) {
                                            return !instanceIdsToRemove.has(entry.instanceId);
                                        }
                                        // For legacy string entries, check if this index matches fromIndices
                                        if (typeof entry === 'string' && action.fromIndices) {
                                            return !action.fromIndices.includes(idx);
                                        }
                                        return !bookIdsToRemove.has(entry);
                                    }) };
                                }
                                return { ...col, books: col.books.filter(id => !action.bookIds.includes(id)) };
                            }
                            if (col.id === action.toColId) {
                                const newBooks = [...col.books];
                                // v4.16.0.ak - Insert entries if available, else bookIds
                                const entriesToInsert = action.entries || action.bookIds;
                                newBooks.splice(action.toIndex, 0, ...entriesToInsert);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'COPY_BOOKS':
                        // v4.16.0.au - Redo copy: re-add the copied entries to target column
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.toColId) {
                                const newBooks = [...col.books];
                                newBooks.splice(action.toIndex, 0, ...action.entries);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'REORDER_BOOKS':
                        // v4.16.0.ak - Re-apply the reorder (use entries for GUID support)
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.colId) {
                                const newBooks = [...col.books];
                                // v4.16.0.ak - Remove by index (fromIndices) for precise targeting
                                // Sort indices descending to remove from end first
                                const sortedIndices = [...action.fromIndices].sort((a, b) => b - a);
                                sortedIndices.forEach(idx => {
                                    if (idx >= 0 && idx < newBooks.length) {
                                        newBooks.splice(idx, 1);
                                    }
                                });
                                // Calculate adjusted insert index (same logic as original reorder)
                                let adjustedIndex = action.toIndex;
                                action.fromIndices.forEach(origIdx => {
                                    if (origIdx < action.toIndex) adjustedIndex--;
                                });
                                // v4.16.0.ak - Insert entries if available, else bookIds
                                const entriesToInsert = action.entries || action.bookIds;
                                newBooks.splice(adjustedIndex, 0, ...entriesToInsert);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    case 'TOGGLE_HIDE':
                        // v4.8.0 - Re-apply the hide/unhide action
                        console.log('[REDO TOGGLE_HIDE] Action:', JSON.stringify(action, null, 2));
                        setBooks(prevBooks => {
                            const updatedBooks = prevBooks.map(book => {
                                if (action.bookIds.includes(book.id)) {
                                    console.log(`[REDO TOGGLE_HIDE] Setting "${book.title}" isHidden: ${book.isHidden} -> ${action.newState}`);
                                    return { ...book, isHidden: action.newState };
                                }
                                return book;
                            });
                            saveBooksToIndexedDB(updatedBooks);
                            return updatedBooks;
                        });
                        break;
                    case 'DELETE_COLUMN':
                        // v4.8.0 - Re-delete the column
                        console.log('[REDO DELETE_COLUMN] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            // Move books to destination column (if any)
                            let updatedCols = cols;
                            if (action.books.length > 0 && action.destinationColId) {
                                updatedCols = cols.map(col => {
                                    if (col.id === action.destinationColId) {
                                        return { ...col, books: [...col.books, ...action.books] };
                                    }
                                    return col;
                                });
                            }
                            // Remove the column
                            console.log(`[REDO DELETE_COLUMN] Deleting column "${action.columnName}"`);
                            return updatedCols.filter(col => col.id !== action.columnId);
                        });
                        break;
                    case 'REORDER_COLUMNS':
                        // v4.8.0 - Move column back to target position
                        console.log('[REDO REORDER_COLUMNS] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => {
                            const currentIndex = cols.findIndex(c => c.id === action.columnId);
                            if (currentIndex === -1) return cols;
                            const newCols = [...cols];
                            const [movedColumn] = newCols.splice(currentIndex, 1);
                            newCols.splice(action.toIndex, 0, movedColumn);
                            console.log(`[REDO REORDER_COLUMNS] Moved column from index ${currentIndex} to ${action.toIndex}`);
                            return newCols;
                        });
                        break;
                    case 'DELETE_DIVIDER':
                        // v4.8.0 - Re-delete the divider
                        console.log('[REDO DELETE_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.columnId) {
                                console.log(`[REDO DELETE_DIVIDER] Deleting divider "${action.divider.label}"`);
                                return {
                                    ...col,
                                    books: col.books.filter(item =>
                                        !(typeof item === 'object' && item.type === 'divider' && item.id === action.divider.id)
                                    )
                                };
                            }
                            return col;
                        }));
                        break;
                    case 'REORDER_DIVIDER':
                        // v4.8.0 - Move divider to target position
                        console.log('[REDO REORDER_DIVIDER] Action:', JSON.stringify(action, null, 2));
                        setColumns(cols => cols.map(col => {
                            if (col.id === action.colId) {
                                const newBooks = [...col.books];
                                // Find and remove divider from current position
                                const currentIdx = newBooks.findIndex(b =>
                                    typeof b === 'object' && b.type === 'divider' && b.id === action.dividerId
                                );
                                if (currentIdx === -1) return col;
                                const [divider] = newBooks.splice(currentIdx, 1);
                                // Calculate adjusted target index (same logic as original reorder)
                                let adjustedIndex = action.toIndex;
                                if (action.fromIndex < action.toIndex) adjustedIndex--;
                                // Insert at target position
                                newBooks.splice(adjustedIndex, 0, divider);
                                console.log(`[REDO REORDER_DIVIDER] Moved divider "${action.dividerLabel}" from index ${currentIdx} to ${adjustedIndex}`);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));
                        break;
                    // v5.0.0-alpha.46 - Explorer folder operations
                    case 'MOVE_BOOKS_FOLDER':
                        // Redo move: remove from source, add to target
                        console.log('[REDO MOVE_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.fromFolderId) {
                                return { ...folder, bookIds: (folder.bookIds || []).filter(id => !action.bookIds.includes(id)) };
                            }
                            if (folder.id === action.toFolderId) {
                                const newBookIds = [...(folder.bookIds || [])];
                                newBookIds.splice(action.toIndex, 0, ...action.bookIds);
                                return { ...folder, bookIds: newBookIds };
                            }
                            return folder;
                        }));
                        break;
                    case 'COPY_BOOKS_FOLDER':
                        // Redo copy: add to target folder
                        console.log('[REDO COPY_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.toFolderId) {
                                const newBookIds = [...(folder.bookIds || [])];
                                newBookIds.splice(action.toIndex, 0, ...action.bookIds);
                                return { ...folder, bookIds: newBookIds };
                            }
                            return folder;
                        }));
                        break;
                    case 'REMOVE_BOOKS_FOLDER':
                        // Redo remove: remove books from folder
                        console.log('[REDO REMOVE_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                return { ...folder, bookIds: (folder.bookIds || []).filter(id => !action.bookIds.includes(id)) };
                            }
                            return folder;
                        }));
                        break;
                    case 'REORDER_BOOKS_FOLDER':
                        // Redo reorder: apply the reorder again
                        console.log('[REDO REORDER_BOOKS_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                const newBookIds = [...(folder.bookIds || [])];
                                // Remove by indices (descending to maintain positions)
                                const sortedIndices = [...action.fromIndices].sort((a, b) => b - a);
                                sortedIndices.forEach(idx => {
                                    if (idx >= 0 && idx < newBookIds.length) newBookIds.splice(idx, 1);
                                });
                                // Calculate adjusted insert index
                                let adjustedIndex = action.toIndex;
                                action.fromIndices.forEach(origIdx => {
                                    if (origIdx < action.toIndex) adjustedIndex--;
                                });
                                // Insert books at target position
                                newBookIds.splice(adjustedIndex, 0, ...action.bookIds);
                                return { ...folder, bookIds: newBookIds };
                            }
                            return folder;
                        }));
                        break;
                    case 'DELETE_FOLDERS':
                        // Redo delete: move orphaned books to destination, then remove folders
                        // v5.0.0-alpha.56 - Handle orphaned books on redo and update selection
                        console.log('[REDO DELETE_FOLDERS] Action:', JSON.stringify(action, null, 2));
                        const folderIdsToDeleteRedo = new Set(action.deletedFolders.map(f => f.id));
                        setFolders(prev => {
                            let updated = prev;
                            // Move orphaned books to destination (if any)
                            if (action.orphanedBooks?.length > 0 && action.orphanDestination) {
                                updated = updated.map(f => {
                                    if (f.id === action.orphanDestination) {
                                        const existingIds = new Set(f.bookIds || []);
                                        const newBookIds = action.orphanedBooks.filter(id => !existingIds.has(id));
                                        return { ...f, bookIds: [...newBookIds, ...(f.bookIds || [])] };
                                    }
                                    return f;
                                });
                            }
                            // Remove deleted folders
                            return updated.filter(f => !folderIdsToDeleteRedo.has(f.id));
                        });
                        // v5.0.0-alpha.58 - Navigate to parent folder instead of All Books
                        if (folderIdsToDeleteRedo.has(selectedFolderId)) {
                            setSelectedFolderId(action.orphanDestination || '__all__');
                        }
                        break;
                    case 'CREATE_FOLDER':
                        // v5.0.0-alpha.51 - Redo folder creation: re-add the folder
                        console.log('[REDO CREATE_FOLDER] Re-adding folder:', action.folder.name);
                        setFolders(prev => [...prev, { ...action.folder }]);
                        setSelectedFolderId(action.folderId);
                        break;
                    case 'REPARENT_FOLDER':
                        // v5.0.0-alpha.78 - Redo reparent: apply the new parentId again
                        console.log('[REDO REPARENT_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (action.folderIds.includes(folder.id)) {
                                return { ...folder, parentId: action.newParentId };
                            }
                            return folder;
                        }));
                        showToast(`Redo: ${action.description}`, 'info');
                        break;
                    case 'MOVE_FOLDER':
                        // v5.0.0-alpha.135 - Redo single folder move: apply new parent
                        console.log('[REDO MOVE_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                return { ...folder, parentId: action.newParentId };
                            }
                            return folder;
                        }));
                        break;
                    case 'CUT_PASTE_FOLDER':
                        // v5.0.0-alpha.141 - Redo cut/paste: apply new parent
                        console.log('[REDO CUT_PASTE_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.folderId) {
                                return { ...folder, parentId: action.newParentId };
                            }
                            return folder;
                        }));
                        break;
                    case 'COPY_PASTE_FOLDER':
                        // v5.0.0-alpha.141 - Redo copy/paste: re-add copied folders
                        console.log('[REDO COPY_PASTE_FOLDER] Action:', JSON.stringify(action, null, 2));
                        // Note: We need to store the copied folders in the action to redo properly
                        // For now, this is a limitation - we can't redo copy operations
                        // TODO: Store copied folder data in action for proper redo
                        showToast('Cannot redo copy operation', 'warning');
                        break;
                    case 'MOVE_BOOKS_TO_FOLDER':
                        // v5.0.0-alpha.166 - Redo book move: move books to target folder again
                        console.log('[REDO MOVE_BOOKS_TO_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.fromFolderId) {
                                // Remove books from source folder
                                return { ...folder, bookIds: folder.bookIds.filter(id => !action.bookIds.includes(id)) };
                            }
                            if (folder.id === action.toFolderId) {
                                // Add books to target folder (at top)
                                return { ...folder, bookIds: [...action.bookIds, ...folder.bookIds] };
                            }
                            return folder;
                        }));
                        break;
                    case 'COPY_BOOKS_TO_FOLDER':
                        // v5.0.0-alpha.166 - Redo book copy: add books to target folder again
                        console.log('[REDO COPY_BOOKS_TO_FOLDER] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.toFolderId) {
                                // Add books to target folder (filter out duplicates first)
                                const existingIds = new Set(folder.bookIds);
                                const newBooks = action.bookIds.filter(id => !existingIds.has(id));
                                return { ...folder, bookIds: [...newBooks, ...folder.bookIds] };
                            }
                            return folder;
                        }));
                        break;
                    case 'PASTE_BOOKS_CUT':
                        // v5.0.0-alpha.168 - Redo cut-paste: remove from source folders, add to target
                        console.log('[REDO PASTE_BOOKS_CUT] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => {
                            // Group books by source folder
                            const sourcesByFolder = {};
                            action.sourcePositions.forEach(pos => {
                                if (!sourcesByFolder[pos.folderId]) sourcesByFolder[pos.folderId] = [];
                                sourcesByFolder[pos.folderId].push(pos.bookId);
                            });

                            return prev.map(folder => {
                                // Remove books from source folders
                                if (sourcesByFolder[folder.id]) {
                                    return { ...folder, bookIds: folder.bookIds.filter(id => !sourcesByFolder[folder.id].includes(id)) };
                                }
                                // Add books to target folder
                                if (folder.id === action.targetFolderId) {
                                    const existingIds = new Set(folder.bookIds);
                                    const newBooks = action.bookIds.filter(id => !existingIds.has(id));
                                    return { ...folder, bookIds: [...folder.bookIds, ...newBooks] };
                                }
                                return folder;
                            });
                        });
                        break;
                    case 'PASTE_BOOKS_COPY':
                        // v5.0.0-alpha.168 - Redo copy-paste: add books to target folder
                        console.log('[REDO PASTE_BOOKS_COPY] Action:', JSON.stringify(action, null, 2));
                        setFolders(prev => prev.map(folder => {
                            if (folder.id === action.targetFolderId) {
                                const existingIds = new Set(folder.bookIds);
                                const newBooks = action.bookIds.filter(id => !existingIds.has(id));
                                return { ...folder, bookIds: [...folder.bookIds, ...newBooks] };
                            }
                            return folder;
                        }));
                        break;
                    case 'REORDER_FOLDER':
                        // v5.0.0-alpha.79 - Redo folder reorder: apply new order
                        console.log('[REDO REORDER_FOLDER] Action:', JSON.stringify(action, null, 2));
                        if (action.parentId) {
                            setFolders(prev => prev.map(folder => {
                                if (folder.id === action.parentId) {
                                    return { ...folder, childFolderIds: action.newOrder };
                                }
                                return folder;
                            }));
                        } else {
                            // Root level - apply new sortIndex
                            setFolders(prev => {
                                const updated = [...prev];
                                action.newOrder.forEach((folderId, idx) => {
                                    const folderIdx = updated.findIndex(f => f.id === folderId);
                                    if (folderIdx >= 0) {
                                        updated[folderIdx] = { ...updated[folderIdx], sortIndex: idx };
                                    }
                                });
                                return updated;
                            });
                        }
                        showToast(`Redo: ${action.description}`, 'info');
                        break;
                    default:
                        console.warn('Unknown action type for redo:', action.type);
                }
            };

            const undo = () => {
                // Use ref to get current stack (avoids stale closure from keyboard handler)
                const currentStack = undoStackRef.current;
                if (currentStack.length === 0) return;
                const action = currentStack[currentStack.length - 1];
                executeUndo(action);
                setUndoStack(prev => prev.slice(0, -1));
                setRedoStack(prev => [...prev, action]);
            };

            const redo = () => {
                // Use ref to get current stack (avoids stale closure from keyboard handler)
                const currentStack = redoStackRef.current;
                if (currentStack.length === 0) return;
                const action = currentStack[currentStack.length - 1];
                executeRedo(action);
                setRedoStack(prev => prev.slice(0, -1));
                setUndoStack(prev => [...prev, action]);
            };

            // v3.13.0 - Select divider and all books in its group
            // v4.19.1 - Fixed to use composite keys for books, include divider in selection
            const selectDividerGroup = (columnId, dividerId) => {
                const column = columns.find(col => col.id === columnId);
                if (!column) return;

                // Find divider index
                const dividerIndex = column.books.findIndex(item =>
                    typeof item === 'object' && item.type === 'divider' && item.id === dividerId
                );
                if (dividerIndex === -1) return;

                // Build composite keys for divider + all books until next divider
                const selectionKeys = [];

                // Add the divider itself (special key format: columnId:divider:dividerId:index)
                selectionKeys.push(`${columnId}:divider:${dividerId}:${dividerIndex}`);

                // Add books from this divider until next divider (or end of column)
                for (let i = dividerIndex + 1; i < column.books.length; i++) {
                    const item = column.books[i];
                    // Stop at next divider
                    if (typeof item === 'object' && item.type === 'divider') break;
                    // Add book with composite key (columnId:bookId:index)
                    const bookId = getBookIdFromEntry(item);
                    if (bookId) selectionKeys.push(`${columnId}:${bookId}:${i}`);
                }

                // Select all items in this group
                setSelectedBooks(new Set(selectionKeys));
                setSelectedDivider({ columnId, dividerId });
                setActiveColumnId(columnId);

                // Set anchor for shift+click (use first book after divider, or divider position if no books)
                if (selectionKeys.length > 1) {
                    const firstBookKey = selectionKeys[1]; // Skip divider key
                    const [, bookId, indexStr] = firstBookKey.split(':');
                    setLastClickedBook({ id: bookId, columnId, index: parseInt(indexStr, 10) });
                } else {
                    // No books under divider - set anchor at divider position
                    setLastClickedBook({ id: dividerId, columnId, index: dividerIndex, isDivider: true });
                }
            };

            const navigateBook = (direction) => {
                if (!modalBook || !modalColumnId) return;

                const column = columns.find(c => c.id === modalColumnId);
                if (!column) return;

                const visibleBooks = filteredBooks(column.books);
                const currentIndex = visibleBooks.findIndex(b => b.id === modalBook.id);
                if (currentIndex === -1) return;

                let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

                if (newIndex < 0 || newIndex >= visibleBooks.length) return;

                const newBook = visibleBooks[newIndex];

                if (newBook) {
                    setModalBook(newBook);
                }
            };

            const getBookPosition = () => {
                if (!modalBook || !modalColumnId) return { current: 0, total: 0 };

                const column = columns.find(c => c.id === modalColumnId);
                if (!column) return { current: 0, total: 0 };

                const visibleBooks = filteredBooks(column.books);
                const currentIndex = visibleBooks.findIndex(b => b.id === modalBook.id);

                if (currentIndex === -1) return { current: 0, total: 0 };

                return {
                    current: currentIndex + 1,
                    total: visibleBooks.length,
                    hasPrev: currentIndex > 0,
                    hasNext: currentIndex < visibleBooks.length - 1
                };
            };

            const handleColumnDragStart = (e, columnId) => {
                e.stopPropagation();
                e.preventDefault();  // Prevent text selection during column drag
                setDragStartPos({ x: e.clientX, y: e.clientY });
                setDragCurrentPos({ x: e.clientX, y: e.clientY });
                setDraggedColumn(columnId);
                setIsDraggingColumn(false);
            };

            const calculateColumnDropPosition = (e) => {
                const columnsContainer = document.querySelector('.columns-container');
                if (!columnsContainer) return null;

                const columnElements = Array.from(columnsContainer.querySelectorAll('[data-column-id]'));
                const mouseX = e.clientX;

                for (let i = 0; i < columnElements.length; i++) {
                    const rect = columnElements[i].getBoundingClientRect();
                    const midpoint = rect.left + rect.width / 2;

                    if (mouseX < midpoint) {
                        return i;
                    }
                }

                return columnElements.length;
            };

            const handleMouseDown = (e, book, columnId, bookIndex) => {
                // v4.16.0.bc - Block Shift for range selection (handled by onClick)
                if (e.shiftKey) {
                    return;
                }

                // v4.16.0.bc - Track Ctrl state for potential copy-drag
                const isCtrlHeld = e.ctrlKey || e.metaKey;
                isCopyDragRef.current = isCtrlHeld;

                // v4.16.0.bc - Always preventDefault to enable drag, but don't clear selection for Ctrl
                // Ctrl+Click multi-select is handled by onClick; Ctrl+Drag copy needs drag to work
                e.preventDefault();

                // v4.16.0.bc - Only clear selection for non-Ctrl clicks on unselected books
                // For Ctrl+Click, onClick will toggle selection; for Ctrl+Drag, we keep current selection
                if (!isCtrlHeld) {
                    // If clicking a book that's not in the selection, clear selection first
                    // v4.16.0.d - Use composite key with index for selection check
                    if (selectedBooks.size > 0 && !selectedBooks.has(`${columnId}:${book.id}:${bookIndex}`)) {
                        clearSelection();
                    }
                }

                setDragStartPos({ x: e.clientX, y: e.clientY });
                // v3.14.0.x - Initialize position ref for ghost
                dragPosRef.current = { x: e.clientX, y: e.clientY };
                setDraggedBook(book);
                setDraggedFromColumn(columnId);
                setDraggedBookIndex(bookIndex); // v4.16.0.d - Remember dragged book's index
                setIsDragging(false);
                // v3.14.0.w - Use ref instead of state
                dropTargetRef.current = null;
            };

            // v3.11.0 - Handle divider dragging
            const handleDividerMouseDown = (e, divider, columnId) => {
                e.preventDefault();
                e.stopPropagation();

                setDragStartPos({ x: e.clientX, y: e.clientY });
                // v3.14.0.x - Initialize position ref for ghost
                dragPosRef.current = { x: e.clientX, y: e.clientY };
                setDraggedBook(divider); // Reuse draggedBook state for dividers
                setDraggedFromColumn(columnId);
                setIsDragging(false);
                // v3.14.0.w - Use ref instead of state
                dropTargetRef.current = null;
            };

            // v3.14.0.r - Build row-based index for a column (called at drag start only)
            // v3.14.0.u - Store scrollTop to calculate offset instead of rebuilding on scroll
            // Groups elements into rows based on Y position, enabling O(log R) lookup instead of O(N)
            const buildColumnIndex = (columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return null;

                const columnElement = document.querySelector(`[data-column-id="${columnId}"] .book-grid`);
                if (!columnElement) return null;

                // v3.14.0.u - Get scrollable container and store its scrollTop
                const scrollContainer = columnElement.closest('.overflow-y-auto');
                const initialScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

                const columnRect = columnElement.getBoundingClientRect();

                // Get all book and divider elements with their positions
                const bookElements = Array.from(columnElement.querySelectorAll('.book-item'));
                const dividerElements = Array.from(columnElement.querySelectorAll('.divider-item'));

                // Build array of all elements with their rect and metadata
                const allItems = [];

                bookElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const bookId = el.dataset.bookId;
                    // v4.16.0.al - Use data-index attribute for accurate index (supports GUID entries)
                    const actualIndex = el.dataset.index !== undefined ? parseInt(el.dataset.index, 10) : column.books.indexOf(bookId);
                    if (actualIndex !== -1 && !isNaN(actualIndex)) {
                        allItems.push({
                            type: 'book',
                            id: bookId,
                            index: actualIndex,
                            rect,
                            top: rect.top,
                            bottom: rect.bottom,
                            left: rect.left,
                            right: rect.right,
                            centerY: rect.top + rect.height / 2
                        });
                    }
                });

                dividerElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const dividerId = el.dataset.dividerId;
                    const actualIndex = column.books.findIndex(item =>
                        typeof item === 'object' && item.type === 'divider' && item.id === dividerId
                    );
                    if (actualIndex !== -1) {
                        allItems.push({
                            type: 'divider',
                            id: dividerId,
                            index: actualIndex,
                            rect,
                            top: rect.top,
                            bottom: rect.bottom,
                            left: rect.left,
                            right: rect.right,
                            centerY: rect.top + rect.height / 2
                        });
                    }
                });

                // Sort by index to ensure correct order
                allItems.sort((a, b) => a.index - b.index);

                // Group into rows based on Y position (items with same top are in same row)
                const rows = [];
                let currentRow = null;
                const ROW_TOLERANCE = 5; // pixels - items within this Y distance are same row

                allItems.forEach(item => {
                    if (!currentRow || Math.abs(item.top - currentRow.top) > ROW_TOLERANCE) {
                        // Start a new row
                        currentRow = {
                            type: item.type === 'divider' ? 'divider' : 'books',
                            top: item.top,
                            bottom: item.bottom,
                            startIndex: item.index,
                            items: [item]
                        };
                        rows.push(currentRow);
                    } else {
                        // Add to current row
                        currentRow.items.push(item);
                        currentRow.bottom = Math.max(currentRow.bottom, item.bottom);
                        // If any item in row is divider, row type is divider
                        if (item.type === 'divider') {
                            currentRow.type = 'divider';
                        }
                    }
                });

                // Sort items within each row by X position (left to right)
                rows.forEach(row => {
                    row.items.sort((a, b) => a.left - b.left);
                });

                // Build row boundaries array for binary search
                const rowBoundaries = rows.map(row => row.top);

                const index = {
                    columnId,
                    columnRect,
                    rows,
                    rowBoundaries,
                    totalItems: column.books.length,
                    initialScrollTop,  // v3.14.0.u - for scroll offset calculation
                    scrollContainer    // v3.14.0.u - reference to get current scrollTop
                };

                columnIndexRef.current[columnId] = index;
                return index;
            };

            // v3.14.0.r - Build index for all visible columns
            const buildAllColumnIndexes = () => {
                columns.forEach(column => {
                    buildColumnIndex(column.id);
                });
            };

            // v3.14.0.r - Binary search to find row containing Y coordinate
            const findRowByY = (rows, rowBoundaries, mouseY) => {
                if (rows.length === 0) return null;

                // Binary search for the row containing mouseY
                let low = 0;
                let high = rows.length - 1;

                // If mouse is above first row, return first row
                if (mouseY < rowBoundaries[0]) {
                    return { row: rows[0], rowIndex: 0, position: 'above' };
                }

                // If mouse is below last row, return last row
                if (mouseY > rows[rows.length - 1].bottom) {
                    return { row: rows[rows.length - 1], rowIndex: rows.length - 1, position: 'below' };
                }

                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    const row = rows[mid];

                    if (mouseY >= row.top && mouseY <= row.bottom) {
                        // Found the row containing mouseY
                        return { row, rowIndex: mid, position: 'within' };
                    } else if (mouseY < row.top) {
                        high = mid - 1;
                    } else {
                        low = mid + 1;
                    }
                }

                // Mouse is in gap between rows - find closest row
                // low now points to the row after the gap
                if (low < rows.length && low > 0) {
                    const prevRow = rows[low - 1];
                    const nextRow = rows[low];
                    const distToPrev = mouseY - prevRow.bottom;
                    const distToNext = nextRow.top - mouseY;
                    if (distToPrev <= distToNext) {
                        return { row: prevRow, rowIndex: low - 1, position: 'below' };
                    } else {
                        return { row: nextRow, rowIndex: low, position: 'above' };
                    }
                }

                // Fallback
                return { row: rows[0], rowIndex: 0, position: 'within' };
            };

            const calculateDropPosition = (e, columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column) return null;

                // v3.14.0.r - Use cached column index for O(log R) lookup
                let colIndex = columnIndexRef.current[columnId];

                // If no index exists (shouldn't happen, but fallback), build it now
                if (!colIndex) {
                    colIndex = buildColumnIndex(columnId);
                }

                if (!colIndex || colIndex.rows.length === 0) {
                    // Empty column
                    return { columnId, index: 0 };
                }

                const mouseX = e.clientX;
                let mouseY = e.clientY;

                // v3.14.0.u - Adjust mouseY for scroll offset
                // The index was built with positions relative to the viewport at initialScrollTop.
                // If the column has scrolled since then, we need to transform mouseY to match
                // the original coordinate space by adding the scroll delta.
                if (colIndex.scrollContainer && colIndex.initialScrollTop !== undefined) {
                    const currentScrollTop = colIndex.scrollContainer.scrollTop;
                    const scrollDelta = currentScrollTop - colIndex.initialScrollTop;
                    mouseY += scrollDelta; // Adjust mouse position to original coordinate space
                }

                // Binary search to find the row
                const result = findRowByY(colIndex.rows, colIndex.rowBoundaries, mouseY);
                if (!result) {
                    return { columnId, index: 0 };
                }

                const { row, position } = result;

                // Handle position above/below row
                if (position === 'above') {
                    // Insert before the first item in this row
                    return { columnId, index: row.startIndex };
                }
                if (position === 'below') {
                    // Insert after the last item in this row
                    const lastItem = row.items[row.items.length - 1];
                    return { columnId, index: lastItem.index + 1 };
                }

                // Position is 'within' the row - determine exact position
                if (row.type === 'divider') {
                    // Divider row: use top/bottom half
                    const dividerItem = row.items[0];
                    const centerY = dividerItem.centerY;
                    const isBelowCenter = mouseY > centerY;
                    return { columnId, index: isBelowCenter ? dividerItem.index + 1 : dividerItem.index };
                }

                // Books row: use X position to find which book, then top/bottom half
                // Find which book the mouse is over (or closest to)
                let targetItem = row.items[0];
                for (const item of row.items) {
                    if (mouseX >= item.left && mouseX <= item.right) {
                        targetItem = item;
                        break;
                    }
                    // If mouse is to the right of this item but left of next, use this item
                    if (mouseX > item.right) {
                        targetItem = item;
                    }
                }

                // Use quadrant logic for books: right-of OR below-center = insert after
                const centerX = targetItem.left + (targetItem.right - targetItem.left) / 2;
                const centerY = targetItem.centerY;
                const isRightOfBook = mouseX > centerX;
                const isBelowBook = mouseY > centerY;

                const insertAfter = isRightOfBook || (!isRightOfBook && isBelowBook);
                return { columnId, index: insertAfter ? targetItem.index + 1 : targetItem.index };
            };

            // v3.14.0.w - Update indicator position directly via DOM (no React re-render)
            const updateIndicatorPosition = () => {
                const target = dropTargetRef.current;
                const indicator = indicatorRef.current;

                if (!indicator) return;

                if (!target || !isDragging) {
                    indicator.style.display = 'none';
                    return;
                }

                const colIndex = columnIndexRef.current[target.columnId];
                if (!colIndex) {
                    indicator.style.display = 'none';
                    return;
                }

                const { rows, columnRect, totalItems } = colIndex;
                const targetIndex = target.index;

                // v3.14.0.u - Calculate scroll delta to transform stored coordinates back to viewport
                let scrollDelta = 0;
                if (colIndex.scrollContainer && colIndex.initialScrollTop !== undefined) {
                    const currentScrollTop = colIndex.scrollContainer.scrollTop;
                    scrollDelta = currentScrollTop - colIndex.initialScrollTop;
                }

                // Default to full column width for divider-style indicators
                let left = columnRect.left;
                let width = columnRect.width;
                let top = columnRect.top - scrollDelta; // Adjust for scroll

                // Empty column case
                if (rows.length === 0 || totalItems === 0) {
                    // Apply styles directly
                    indicator.style.display = 'block';
                    indicator.style.top = (columnRect.top - scrollDelta - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // Find the row and item at/before the target index
                let targetRow = null;
                let targetItem = null;
                let insertBefore = true; // Are we inserting before or after this item?

                for (const row of rows) {
                    for (const item of row.items) {
                        if (item.index === targetIndex) {
                            // Insert before this item
                            targetRow = row;
                            targetItem = item;
                            insertBefore = true;
                            break;
                        } else if (item.index === targetIndex - 1) {
                            // Insert after this item
                            targetRow = row;
                            targetItem = item;
                            insertBefore = false;
                        }
                    }
                    if (targetItem && insertBefore) break; // Found exact match
                }

                // Start of column (index 0, before first item)
                if (targetIndex === 0 && rows.length > 0) {
                    const firstRow = rows[0];
                    top = firstRow.top - scrollDelta; // Adjust for scroll
                    if (firstRow.type === 'books' && firstRow.items.length > 0) {
                        // Use first book's width
                        const firstItem = firstRow.items[0];
                        left = firstItem.left;
                        width = firstItem.right - firstItem.left;
                    }
                    indicator.style.display = 'block';
                    indicator.style.top = (top - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // End of column (after last item)
                if (targetIndex >= totalItems) {
                    const lastRow = rows[rows.length - 1];
                    top = lastRow.bottom - scrollDelta; // Adjust for scroll
                    if (lastRow.type === 'books' && lastRow.items.length > 0) {
                        const lastItem = lastRow.items[lastRow.items.length - 1];
                        left = lastItem.left;
                        width = lastItem.right - lastItem.left;
                    }
                    indicator.style.display = 'block';
                    indicator.style.top = (top - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // Normal case: between items
                if (targetRow && targetItem) {
                    if (insertBefore) {
                        top = targetItem.top - scrollDelta; // Adjust for scroll
                    } else {
                        top = targetItem.bottom - scrollDelta; // Adjust for scroll
                    }

                    // For books, use the item's width; for dividers, use full width
                    if (targetRow.type === 'books') {
                        left = targetItem.left;
                        width = targetItem.right - targetItem.left;
                    }
                    indicator.style.display = 'block';
                    indicator.style.top = (top - 3) + 'px';
                    indicator.style.left = left + 'px';
                    indicator.style.width = width + 'px';
                    return;
                }

                // Fallback: position at column top
                indicator.style.display = 'block';
                indicator.style.top = (columnRect.top - scrollDelta - 3) + 'px';
                indicator.style.left = left + 'px';
                indicator.style.width = width + 'px';
            };

            // v3.14.0.x - Update ghost position via DOM (no React re-render)
            const updateGhostPosition = (x, y) => {
                dragPosRef.current = { x, y };
                const ghost = dragGhostRef.current;
                if (ghost) {
                    ghost.style.left = (x - 50) + 'px';
                    ghost.style.top = (y - 75) + 'px';
                }
                // v4.16.0.au - Update tooltip position (below ghost)
                // v4.16.0.ax - Measure actual ghost height to position tooltip correctly
                const tooltip = dragTooltipRef.current;
                if (tooltip && ghost) {
                    const ghostHeight = ghost.offsetHeight || 150;  // Fallback to 150 if not measured yet
                    const tooltipGap = 8;  // Gap between ghost bottom and tooltip
                    tooltip.style.left = (x - 50) + 'px';
                    tooltip.style.top = (y - 75 + ghostHeight + tooltipGap) + 'px';
                }
            };

            // v4.16.0.au - Update drag tooltip text based on copy mode and target column
            // v4.16.0.ay - Added isInvalid parameter for invalid drop targets
            const updateDragTooltip = (isCopy, targetColumnId, isInvalid = false) => {
                const tooltip = dragTooltipRef.current;
                if (!tooltip) return;

                if (isInvalid) {
                    tooltip.textContent = `🚫 Can't drop here`;
                    tooltip.style.display = 'block';
                    return;
                }

                const targetColumn = columns.find(c => c.id === targetColumnId);
                const columnName = targetColumn ? targetColumn.name : '';  // v4.16.0.aw - Fix: columns use .name not .title

                if (columnName) {
                    tooltip.textContent = isCopy ? `+ Copy to ${columnName}` : `→ Move to ${columnName}`;
                    tooltip.style.display = 'block';
                } else {
                    tooltip.style.display = 'none';
                }
            };

            const handleMouseMove = (e) => {
                // v5.0.0-alpha.111 - Handle column resizing (min width 35px, table-layout fixed)
                if (resizingColumn) {
                    const deltaX = e.clientX - resizingColumn.startX;
                    const newWidth = Math.max(35, resizingColumn.startWidth + deltaX);

                    // Update CSS custom property directly (no React re-render)
                    document.documentElement.style.setProperty(`--col-${resizingColumn.columnId}`, `${newWidth}px`);

                    // Store current width for mouseup commit
                    resizingColumn.currentWidth = newWidth;
                    return;
                }

                // v5.0.0-alpha.91 - Handle pane resizing
                if (isResizingPane) {
                    const newWidth = Math.max(200, Math.min(600, e.clientX));
                    setLeftPaneWidth(newWidth);
                    return;
                }

                if (draggedColumn) {
                    setDragCurrentPos({ x: e.clientX, y: e.clientY }); // Column drag still uses state (low volume)

                    const deltaX = e.clientX - dragStartPos.x;
                    const deltaY = e.clientY - dragStartPos.y;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    if (distance > dragThreshold) {
                        if (!isDraggingColumn) {
                            setIsDraggingColumn(true);
                        }
                        const dropPos = calculateColumnDropPosition(e);
                        setColumnDropTarget(dropPos);
                    }
                    return;
                }

                if (!draggedBook) return;

                // v3.14.0.x - Update ghost position via DOM (no React re-render)
                updateGhostPosition(e.clientX, e.clientY);

                const deltaX = e.clientX - dragStartPos.x;
                const deltaY = e.clientY - dragStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance > dragThreshold) {
                    if (!isDragging) {
                        setIsDragging(true);
                        // v3.14.0.r - Build column indexes once at drag start for O(log R) lookup
                        buildAllColumnIndexes();
                    }

                    // v4.16.0.au - Track Ctrl state during drag for copy mode
                    isCopyDragRef.current = e.ctrlKey || e.metaKey;

                    const target = e.target.closest('[data-column-id]');
                    if (target) {
                        const columnId = target.dataset.columnId;
                        // v3.14.0.g - Use cursor position for drop detection (matches ghost center)
                        const dropPos = calculateDropPosition(e, columnId);

                        // v3.14.0.w - Update ref instead of state to avoid React re-renders
                        dropTargetRef.current = dropPos;
                        updateIndicatorPosition();

                        // v4.16.0.au - Update drag tooltip with copy/move and target column
                        updateDragTooltip(isCopyDragRef.current, columnId);

                        // v3.14.0.h - Debug logging when drop target changes
                        const prevDropTarget = prevDropTargetRef.current;
                        const dropTargetChanged = !prevDropTarget ||
                            prevDropTarget.columnId !== dropPos.columnId ||
                            prevDropTarget.index !== dropPos.index;

                        if (dropTargetChanged) {
                            prevDropTargetRef.current = dropPos;
                        }

                        // v3.12.0.c - Auto-scroll when dragging near column edges
                        // Use dragged book position (center of ghost) instead of cursor position
                        // Scroll speed proportional to proximity (closer = faster)
                        const columnElement = target.querySelector('.overflow-y-auto');
                        if (columnElement) {
                            const rect = columnElement.getBoundingClientRect();
                            const edgeThreshold = 100; // pixels from top/bottom to trigger scroll
                            const minScrollSpeed = 2; // pixels per interval at threshold edge
                            const maxScrollSpeed = 20; // pixels per interval at column edge
                            const scrollInterval = 50; // milliseconds

                            // Calculate dragged book's center position (ghost is at dragPosRef.current.y - 75, with height ~150px)
                            // v3.14.0.x - Use ref instead of state
                            const draggedBookCenterY = dragPosRef.current.y;

                            const distanceFromTop = draggedBookCenterY - rect.top;
                            const distanceFromBottom = rect.bottom - draggedBookCenterY;

                            // Clear existing auto-scroll interval
                            if (autoScrollInterval) {
                                clearInterval(autoScrollInterval);
                                setAutoScrollInterval(null);
                            }

                            // Start scrolling up if book center near top edge
                            if (distanceFromTop < edgeThreshold && distanceFromTop > 0) {
                                // Calculate proportional speed: closer to edge = faster
                                // distanceFromTop: 0px (at edge) → 100px (threshold edge)
                                // speed: maxScrollSpeed (at edge) → minScrollSpeed (threshold edge)
                                const proximity = 1 - (distanceFromTop / edgeThreshold); // 1.0 at edge, 0.0 at threshold
                                const scrollSpeed = minScrollSpeed + (proximity * (maxScrollSpeed - minScrollSpeed));

                                const interval = setInterval(() => {
                                    columnElement.scrollTop = Math.max(0, columnElement.scrollTop - scrollSpeed);
                                    // v3.14.0.u - No longer rebuild index; scroll offset calculated dynamically
                                }, scrollInterval);
                                setAutoScrollInterval(interval);
                            }
                            // Start scrolling down if book center near bottom edge
                            else if (distanceFromBottom < edgeThreshold && distanceFromBottom > 0) {
                                // Calculate proportional speed: closer to edge = faster
                                const proximity = 1 - (distanceFromBottom / edgeThreshold);
                                const scrollSpeed = minScrollSpeed + (proximity * (maxScrollSpeed - minScrollSpeed));

                                const interval = setInterval(() => {
                                    columnElement.scrollTop = Math.min(
                                        columnElement.scrollHeight - columnElement.clientHeight,
                                        columnElement.scrollTop + scrollSpeed
                                    );
                                    // v3.14.0.u - No longer rebuild index; scroll offset calculated dynamically
                                }, scrollInterval);
                                setAutoScrollInterval(interval);
                            }
                        }
                    } else {
                        // v3.14.0.w - Clear ref and hide indicator
                        dropTargetRef.current = null;
                        updateIndicatorPosition();
                        // v4.16.0.ay - Show invalid drop target tooltip
                        updateDragTooltip(false, null, true);
                        // Clear auto-scroll if mouse leaves column
                        if (autoScrollInterval) {
                            clearInterval(autoScrollInterval);
                            setAutoScrollInterval(null);
                        }
                    }
                }
            };

            const handleMouseUp = (e) => {
                // v5.0.0-alpha.110 - Stop column resizing and commit final width
                if (resizingColumn) {
                    // Commit final width to React state
                    if (resizingColumn.currentWidth !== undefined) {
                        setColumnWidths(prev => ({
                            ...prev,
                            [resizingColumn.columnId]: resizingColumn.currentWidth
                        }));
                    }

                    // Clear CSS custom property
                    document.documentElement.style.removeProperty(`--col-${resizingColumn.columnId}`);

                    setResizingColumn(null);
                    return;
                }

                // v5.0.0-alpha.91 - Stop pane resizing
                if (isResizingPane) {
                    setIsResizingPane(false);
                    return;
                }

                // v3.12.0 - Clear auto-scroll interval when drag ends
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    setAutoScrollInterval(null);
                }

                if (isDraggingColumn && draggedColumn && columnDropTarget !== null) {
                    const currentIndex = columns.findIndex(c => c.id === draggedColumn);
                    if (currentIndex !== -1 && currentIndex !== columnDropTarget) {
                        const newColumns = [...columns];
                        const [movedColumn] = newColumns.splice(currentIndex, 1);
                        const adjustedIndex = currentIndex < columnDropTarget ? columnDropTarget - 1 : columnDropTarget;
                        newColumns.splice(adjustedIndex, 0, movedColumn);
                        setColumns(newColumns);
                        // v4.8.0 - Record action for undo
                        recordAction({
                            type: 'REORDER_COLUMNS',
                            columnId: draggedColumn,
                            fromIndex: currentIndex,
                            toIndex: adjustedIndex
                        });
                    }

                    setDraggedColumn(null);
                    setIsDraggingColumn(false);
                    setColumnDropTarget(null);
                    return;
                }

                // v3.14.0.w - Read from ref instead of state
                const dropTarget = dropTargetRef.current;

                if (!isDragging || !draggedBook || !dropTarget) {
                    setDraggedBook(null);
                    setDraggedFromColumn(null);
                    setIsDragging(false);
                    dropTargetRef.current = null;
                    updateIndicatorPosition();
                    setDraggedColumn(null);
                    setIsDraggingColumn(false);
                    setColumnDropTarget(null);
                    return;
                }

                const sourceColumn = columns.find(c => c.id === draggedFromColumn);
                const targetColumn = columns.find(c => c.id === dropTarget.columnId);

                if (!sourceColumn || !targetColumn) {
                    console.error('Invalid source or target column');
                    setDraggedBook(null);
                    setDraggedFromColumn(null);
                    setIsDragging(false);
                    dropTargetRef.current = null;
                    updateIndicatorPosition();
                    clearSelection();
                    return;
                }

                // v3.13.0 - Handle dividers (can move with their book group if selected)
                const isDivider = typeof draggedBook === 'object' && draggedBook.type === 'divider';

                // v4.16.0.ae/af - Determine which items to move using indices (not bookIds)
                // This fixes bug where dragging one instance of a duplicated book affected all copies
                // v4.16.0.af - Include columnId to support multi-column selection
                let itemsToMoveInfo; // Array of {columnId, index, entry, bookId} or divider objects
                let isDraggingSelection = false;

                if (isDivider) {
                    // v3.13.0 - If divider is selected, move divider + all books in its group
                    if (selectedDivider && selectedDivider.dividerId === draggedBook.id) {
                        // Build array: divider + selected entries
                        const selectedEntries = getSelectedEntries();
                        itemsToMoveInfo = [
                            { isDivider: true, divider: draggedBook, columnId: draggedFromColumn },
                            ...selectedEntries.map(sel => ({ columnId: sel.columnId, index: sel.index, entry: sel.entry, bookId: sel.bookId }))
                        ];
                        isDraggingSelection = true;
                    } else {
                        // Divider not selected: move alone
                        itemsToMoveInfo = [{ isDivider: true, divider: draggedBook, columnId: draggedFromColumn }];
                    }
                } else {
                    // Regular book: move selection or just this book
                    // v4.16.0.d - Use composite key with index for selection check
                    const isInSelection = selectedBooks.size > 0 && selectedBooks.has(`${draggedFromColumn}:${draggedBook.id}:${draggedBookIndex}`);
                    if (isInSelection) {
                        // Move all selected books - use getSelectedEntries for accurate indices
                        // v4.16.0.af - Include columnId for multi-column selection support
                        const selectedEntries = getSelectedEntries();
                        itemsToMoveInfo = selectedEntries.map(sel => ({ columnId: sel.columnId, index: sel.index, entry: sel.entry, bookId: sel.bookId }));
                        isDraggingSelection = true;
                    } else {
                        // Move just the dragged book - use draggedBookIndex
                        const sourceCol = columns.find(c => c.id === draggedFromColumn);
                        itemsToMoveInfo = [{
                            columnId: draggedFromColumn,
                            index: draggedBookIndex,
                            entry: sourceCol.books[draggedBookIndex],
                            bookId: draggedBook.id
                        }];
                    }
                }

                if (draggedFromColumn === dropTarget.columnId) {
                    // Same column: reorder or copy
                    // v4.16.0.ae - Extract indices and entries from itemsToMoveInfo
                    const bookEntries = itemsToMoveInfo.filter(item => !item.isDivider);
                    const dividerEntry = itemsToMoveInfo.find(item => item.isDivider);
                    const fromIndicesReorder = bookEntries.map(item => item.index);
                    const bookIdsToMove = bookEntries.map(item => item.bookId);

                    // v4.16.0.au - Check if this is a copy operation (Ctrl held) - books only, not dividers
                    const isCopyOperation = isCopyDragRef.current && !isDivider;

                    if (isCopyOperation && bookEntries.length > 0) {
                        // v4.16.0.au - COPY within same column: Create new GUID entries at drop position
                        // v4.16.0.be - Capture isHidden for both GUID and legacy entries
                        const newEntries = bookEntries.map(item => {
                            const sourceInstanceId = typeof item.entry === 'object' && item.entry.instanceId ? item.entry.instanceId : null;
                            const book = books.find(b => b.id === item.bookId);
                            // v4.16.0.be - Determine hidden state: GUID uses hiddenInstances, legacy uses book.isHidden
                            const sourceIsHidden = sourceInstanceId
                                ? hiddenInstances.has(sourceInstanceId)
                                : (book?.isHidden || false);
                            return {
                                instanceId: generateInstanceId(),
                                bookId: item.bookId,
                                sourceIsHidden
                            };
                        });

                        // Copy hidden state for instances that were hidden
                        // v4.16.0.be - Use sourceIsHidden (supports legacy entries)
                        const newHiddenInstanceIds = newEntries
                            .filter(entry => entry.sourceIsHidden)
                            .map(entry => entry.instanceId);

                        if (newHiddenInstanceIds.length > 0) {
                            setHiddenInstances(prev => {
                                const updated = new Set(prev);
                                newHiddenInstanceIds.forEach(id => updated.add(id));
                                return updated;
                            });
                        }

                        // Clean entries before storing
                        const cleanEntries = newEntries.map(({ instanceId, bookId }) => ({ instanceId, bookId }));

                        const currentCol = columns.find(c => c.id === draggedFromColumn);
                        setColumns(columns.map(col => {
                            if (col.id === draggedFromColumn) {
                                const newBooks = [...col.books];
                                const insertIndex = Math.min(dropTarget.index, newBooks.length);
                                newBooks.splice(insertIndex, 0, ...cleanEntries);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));

                        // Record COPY_BOOKS action for undo
                        recordAction({
                            type: 'COPY_BOOKS',
                            bookIds: [...bookIdsToMove],
                            entries: [...cleanEntries],
                            toColId: draggedFromColumn,
                            toIndex: dropTarget.index
                        });

                        console.log(`📋 Copied ${cleanEntries.length} book(s) within ${currentCol.title}`);
                    } else {
                        // v4.8.0 - Capture divider's original index for undo
                        const currentCol = columns.find(c => c.id === draggedFromColumn);
                        const dividerFromIndex = isDivider ? currentCol.books.findIndex(b =>
                            typeof b === 'object' && b.type === 'divider' && b.id === draggedBook.id
                        ) : -1;

                        setColumns(columns.map(col => {
                            if (col.id === draggedFromColumn) {
                                const newBooks = [...col.books];

                                // v4.16.0.ae - Collect indices to remove (divider index + book indices)
                                const indicesToRemove = new Set(fromIndicesReorder);
                                if (dividerEntry && dividerFromIndex !== -1) {
                                    indicesToRemove.add(dividerFromIndex);
                                }

                                // v4.16.0.ae - Remove entries by index, preserving them for re-insertion
                                // Sort indices descending so we can splice without affecting other indices
                                const sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
                                const removedEntries = [];
                                sortedIndices.forEach(idx => {
                                    removedEntries.unshift(newBooks[idx]); // unshift to maintain order
                                    newBooks.splice(idx, 1);
                                });

                                // Calculate adjusted insert index
                                let adjustedIndex = dropTarget.index;
                                sortedIndices.forEach(idx => {
                                    if (idx < dropTarget.index) {
                                        adjustedIndex--;
                                    }
                                });

                                // Insert all items at the target position (preserving original format)
                                newBooks.splice(adjustedIndex, 0, ...removedEntries);

                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));

                        // v4.8.0 - Record REORDER_BOOKS action (only for books, not dividers)
                        // v4.16.0.aj - Store entries for proper undo with GUID support
                        if (bookIdsToMove.length > 0 && !isDivider) {
                            recordAction({
                                type: 'REORDER_BOOKS',
                                bookIds: [...bookIdsToMove],
                                entries: bookEntries.map(item => item.entry), // v4.16.0.aj
                                colId: draggedFromColumn,
                                fromIndices: fromIndicesReorder,
                                toIndex: dropTarget.index
                            });
                        }
                        // v4.8.0 - Record REORDER_DIVIDER action
                        if (isDivider && dividerFromIndex !== -1) {
                            recordAction({
                                type: 'REORDER_DIVIDER',
                                dividerId: draggedBook.id,
                                dividerLabel: draggedBook.label,
                                colId: draggedFromColumn,
                                fromIndex: dividerFromIndex,
                                toIndex: dropTarget.index
                            });
                        }
                    }
                } else {
                    // Cross-column: move or copy items (dividers can only move within same column)
                    if (isDivider) {
                        console.log('Dividers cannot be moved between columns');
                        setDraggedBook(null);
                        setDraggedFromColumn(null);
                        setIsDragging(false);
                        dropTargetRef.current = null;
                        updateIndicatorPosition();
                        return;
                    }

                    // v4.16.0.au - Check if this is a copy operation (Ctrl held)
                    const isCopyOperation = isCopyDragRef.current;

                    // v4.16.0.af - Group items by source column to handle multi-column selection
                    const targetCol = columns.find(c => c.id === dropTarget.columnId);
                    const bookIdsToMove = itemsToMoveInfo.map(item => item.bookId);
                    const actualToIndex = Math.min(dropTarget.index, targetCol.books.length);

                    if (isCopyOperation) {
                        // v4.16.0.au - COPY: Create new GUID entries, don't remove from source
                        // v4.16.0.be - Capture isHidden for both GUID and legacy entries
                        const newEntries = itemsToMoveInfo.map(item => {
                            const sourceInstanceId = typeof item.entry === 'object' && item.entry.instanceId ? item.entry.instanceId : null;
                            const book = books.find(b => b.id === item.bookId);
                            // v4.16.0.be - Determine hidden state: GUID uses hiddenInstances, legacy uses book.isHidden
                            const sourceIsHidden = sourceInstanceId
                                ? hiddenInstances.has(sourceInstanceId)
                                : (book?.isHidden || false);
                            return {
                                instanceId: generateInstanceId(),
                                bookId: item.bookId,
                                sourceIsHidden
                            };
                        });

                        // Copy hidden state for instances that were hidden
                        // v4.16.0.be - Use sourceIsHidden (supports legacy entries)
                        const newHiddenInstanceIds = newEntries
                            .filter(entry => entry.sourceIsHidden)
                            .map(entry => entry.instanceId);

                        if (newHiddenInstanceIds.length > 0) {
                            setHiddenInstances(prev => {
                                const updated = new Set(prev);
                                newHiddenInstanceIds.forEach(id => updated.add(id));
                                return updated;
                            });
                        }

                        // Clean entries before storing (remove sourceInstanceId)
                        const cleanEntries = newEntries.map(({ instanceId, bookId }) => ({ instanceId, bookId }));

                        setColumns(columns.map(col => {
                            if (col.id === dropTarget.columnId) {
                                const newBooks = [...col.books];
                                const insertIndex = Math.min(dropTarget.index, newBooks.length);
                                newBooks.splice(insertIndex, 0, ...cleanEntries);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));

                        // Record COPY_BOOKS action for undo
                        recordAction({
                            type: 'COPY_BOOKS',
                            bookIds: [...bookIdsToMove],
                            entries: [...cleanEntries],
                            toColId: dropTarget.columnId,
                            toIndex: actualToIndex
                        });

                        console.log(`📋 Copied ${cleanEntries.length} book(s) to ${targetCol.title}`);
                    } else {
                        // v4.16.0.af - MOVE: Remove from source, add to target
                        const entriesToMove = itemsToMoveInfo.map(item => item.entry);

                        // Build map of columnId -> Set of indices to remove
                        const indicesToRemoveByColumn = new Map();
                        itemsToMoveInfo.forEach(item => {
                            if (!indicesToRemoveByColumn.has(item.columnId)) {
                                indicesToRemoveByColumn.set(item.columnId, new Set());
                            }
                            indicesToRemoveByColumn.get(item.columnId).add(item.index);
                        });

                        // For undo, capture fromIndices from the primary drag column
                        const fromIndices = itemsToMoveInfo
                            .filter(item => item.columnId === draggedFromColumn)
                            .map(item => item.index);

                        setColumns(columns.map(col => {
                            // Check if this column has items to remove
                            const indicesToRemove = indicesToRemoveByColumn.get(col.id);
                            if (indicesToRemove && indicesToRemove.size > 0) {
                                // Remove by index from this source column
                                const filteredBooks = col.books.filter((_, idx) => !indicesToRemove.has(idx));
                                // If this is also the target, add entries
                                if (col.id === dropTarget.columnId) {
                                    const newBooks = [...filteredBooks];
                                    const insertIndex = Math.min(dropTarget.index, newBooks.length);
                                    newBooks.splice(insertIndex, 0, ...entriesToMove);
                                    return { ...col, books: newBooks };
                                }
                                return { ...col, books: filteredBooks };
                            }
                            if (col.id === dropTarget.columnId) {
                                // Add original entries to target column (preserving format)
                                const newBooks = [...col.books];
                                const insertIndex = Math.min(dropTarget.index, newBooks.length);
                                newBooks.splice(insertIndex, 0, ...entriesToMove);
                                return { ...col, books: newBooks };
                            }
                            return col;
                        }));

                        // v4.8.0 - Record action for undo
                        // v4.16.0.aj - Store entries for proper undo with GUID support
                        recordAction({
                            type: 'MOVE_BOOKS',
                            bookIds: [...bookIdsToMove],
                            entries: [...entriesToMove],
                            fromColId: draggedFromColumn,
                            toColId: dropTarget.columnId,
                            fromIndices,
                            toIndex: actualToIndex
                        });
                    }
                }

                new Image().src = 'https://readerwrangler.goatcounter.com/count?p=/event/book-dragged';
                setDraggedBook(null);
                setDraggedFromColumn(null);
                setIsDragging(false);
                dropTargetRef.current = null;
                updateIndicatorPosition();
                clearSelection();
            };

            const getAllCollectionNames = () => {
                const collectionNames = new Set();
                books.forEach(book => {
                    if (book.collections && book.collections.length > 0) {
                        book.collections.forEach(c => collectionNames.add(c.name));
                    }
                });
                return Array.from(collectionNames).sort();
            };

            const getAllSeriesNames = () => {
                const seriesNames = new Set();
                books.forEach(book => {
                    if (book.series && book.series.trim() !== '') {
                        seriesNames.add(book.series);
                    }
                });
                return Array.from(seriesNames).sort();
            };

            const filteredBooks = (bookIds) => {
                // Check if any filter is active (needed inside function scope for divider hiding)
                const filtersActive = !!(searchTerm || readStatusFilter || collectionFilter ||
                    ratingFilter || ownershipFilter || seriesFilter || dateFrom || dateTo || dealsFilterActive ||
                    (tagFilter && tagFilter.length > 0));

                // v4.27.0 - Track current divider tags for inheritance during map
                let currentDivTags = [];
                const result = bookIds.map(item => {
                    // v3.11.0 - Handle dividers (pass through as-is, but track their tags)
                    if (typeof item === 'object' && item.type === 'divider') {
                        currentDivTags = item.tags || [];  // v4.27.0 - track for inheritance
                        return item;
                    }
                    // v4.16.0.s - Handle both legacy string and new {instanceId, bookId} format
                    const bookId = getBookIdFromEntry(item);
                    const instanceId = getInstanceId(item);
                    const book = books.find(b => b.id === bookId);
                    // Attach instanceId to book for per-instance hidden check
                    // v4.27.0 - Also attach inherited tags from current divider
                    if (book) {
                        return { ...book, _instanceId: instanceId, _inheritedTags: currentDivTags };
                    }
                    return book;
                }).filter(book => {
                    // v3.11.0 - Dividers always pass through filters (will be post-processed below)
                    if (typeof book === 'object' && book.type === 'divider') return true;

                    if (!book) return false;

                    // Text search filter
                    const matchesSearch = !searchTerm ||
                        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        book.author.toLowerCase().includes(searchTerm.toLowerCase());

                    // Read status filter
                    const matchesReadStatus = !readStatusFilter || book.readStatus === readStatusFilter;

                    // Collection filter
                    let matchesCollection = true;
                    if (collectionFilter) {
                        if (collectionFilter === 'UNCOLLECTED') {
                            matchesCollection = !book.collections || book.collections.length === 0;
                        } else {
                            matchesCollection = book.collections &&
                                book.collections.some(c => c.name === collectionFilter);
                        }
                    }

                    // Rating filter (NEW v3.8.0)
                    const matchesRating = !ratingFilter || (book.rating >= parseFloat(ratingFilter));

                    // Ownership type filter (v4.9.0, v5.0.4 - wishlist checks both fields)
                    const matchesOwnership = !ownershipFilter ||
                        (ownershipFilter === 'wishlist'
                            ? (book.onWishlist || book.ownershipType === 'wishlist')
                            : (book.ownershipType || 'purchased') === ownershipFilter);

                    // Hidden filter (v4.1.0.d, v4.16.0.s - per-instance hidden support)
                    // New format: check hiddenInstances Set by instanceId
                    // Legacy format: check book.isHidden flag
                    let matchesHidden = true;
                    if (!showHidden) {
                        if (book._instanceId) {
                            // New format - check per-instance hidden
                            matchesHidden = !hiddenInstances.has(book._instanceId);
                        } else {
                            // Legacy format - check book-level hidden
                            matchesHidden = !book.isHidden;
                        }
                    }

                    // Series filter (NEW v3.8.0.k)
                    let matchesSeries = true;
                    if (seriesFilter) {
                        if (seriesFilter === 'NOT_IN_SERIES') {
                            matchesSeries = !book.series || book.series.trim() === '';
                        } else {
                            matchesSeries = book.series && book.series === seriesFilter;
                        }
                    }

                    // Date range filter (NEW v3.8.0.k, fixed v3.8.0.l for epoch milliseconds and field name)
                    let matchesDateRange = true;
                    if (dateFrom || dateTo) {
                        if (book.acquired) {
                            // Convert epoch milliseconds to YYYY-MM-DD
                            const bookDate = new Date(parseInt(book.acquired)).toISOString().split('T')[0];
                            const fromDate = dateFrom || '0000-01-01'; // Default to earliest date if From is empty
                            const toDate = dateTo || new Date().toISOString().split('T')[0]; // Default to today if To is empty

                            if (bookDate < fromDate || bookDate > toDate) {
                                matchesDateRange = false;
                            }
                        } else {
                            matchesDateRange = false; // Exclude books without acquisition dates when filter is active
                        }
                    }

                    // Deals filter (v5.0.0-alpha.163 - works for all books, not just wishlist)
                    const matchesDeals = !dealsFilterActive ||
                        (book.priceTrigger != null && book.currentPrice != null && book.currentPrice <= book.priceTrigger);

                    // Tag filter (v4.27.0 - OR logic: book matches if it has ANY of the selected tags)
                    // Check both explicit tags and inherited tags from dividers
                    const explicitMatch = book.tags && book.tags.some(tag => tagFilter.includes(tag));
                    const inheritedMatch = book._inheritedTags && book._inheritedTags.some(tag => tagFilter.includes(tag));
                    const matchesTags = !tagFilter || tagFilter.length === 0 || explicitMatch || inheritedMatch;

                    return matchesSearch && matchesReadStatus && matchesCollection && matchesRating && matchesOwnership && matchesHidden && matchesSeries && matchesDateRange && matchesDeals && matchesTags;
                });

                // v4.15.3 - Post-process: hide dividers with no books under them when filters active
                if (!filtersActive) return result;

                // Walk backwards through array, tracking if we've seen a book since last divider
                // A divider is kept only if there's at least one book between it and the next divider (or end)
                // v4.15.4.a - Also keep divider if its label matches searchTerm
                let hasBookAfter = false;
                const keepDivider = new Set();
                for (let i = result.length - 1; i >= 0; i--) {
                    const item = result[i];
                    if (item && item.type === 'divider') {
                        if (hasBookAfter) {
                            keepDivider.add(item.id);
                        }
                        // v4.15.4.a - Keep divider if its label matches search term
                        if (searchTerm && item.label && item.label.toLowerCase().includes(searchTerm.toLowerCase())) {
                            keepDivider.add(item.id);
                        }
                        hasBookAfter = false; // Reset for next divider section
                    } else if (item) {
                        hasBookAfter = true;
                    }
                }

                return result.filter(item => {
                    if (item && item.type === 'divider') {
                        return keepDivider.has(item.id);
                    }
                    return true;
                });
            };

            // v4.0.1 - Keep filteredBooksRef updated for Ctrl+A handler
            filteredBooksRef.current = filteredBooks;

            // v4.16.0.a - Check if any filter is active (for hiding empty columns/dividers)
            const hasActiveFilters = !!(searchTerm || readStatusFilter || collectionFilter ||
                ratingFilter || ownershipFilter || seriesFilter || dateFrom || dateTo ||
                (tagFilter && tagFilter.length > 0));

            // v5.0.0-alpha.169 - Filtered Folder View: Save/restore expansion state when filters change
            useEffect(() => {
                if (hasActiveFilters) {
                    // Save current expansion state before modifying (only once when filter becomes active)
                    if (!savedExpansionState) {
                        const currentState = new Map();
                        folders.forEach(f => currentState.set(f.id, f.collapsed));
                        setSavedExpansionState(currentState);
                    }

                    // Auto-expand folders with matching books
                    const foldersToExpand = new Set();
                    folders.forEach(folder => {
                        const { matching } = getFilteredFolderCount(folder.id);
                        if (matching > 0) {
                            // Expand this folder and all ancestors
                            let current = folder;
                            while (current) {
                                foldersToExpand.add(current.id);
                                current = folders.find(f => f.id === current.parentId);
                            }
                        }
                    });

                    if (foldersToExpand.size > 0) {
                        setFolders(prev => prev.map(f =>
                            foldersToExpand.has(f.id) ? { ...f, collapsed: false } : f
                        ));
                    }
                } else {
                    // Restore saved expansion state when filter is cleared
                    if (savedExpansionState) {
                        setFolders(prev => prev.map(f => ({
                            ...f,
                            collapsed: savedExpansionState.get(f.id) ?? f.collapsed
                        })));
                        setSavedExpansionState(null);
                    }
                    // Reset show all override
                    setShowAllFoldersOverride(false);
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [hasActiveFilters]);

            // v5.0.0-alpha.169 - Reset "show all" override when any filter changes
            useEffect(() => {
                setShowAllFoldersOverride(false);
            }, [searchTerm, readStatusFilter, collectionFilter, ratingFilter,
                ownershipFilter, seriesFilter, dateFrom, dateTo, tagFilter, dealsFilterActive]);

            // Calculate combined urgency from Library and Collections status
            // Urgency is based ONLY on Load status (what's in the app right now)
            const getUrgencyInfo = () => {
                const libLoad = libraryStatus.loadStatus;
                const colLoad = collectionsStatus.loadStatus;

                // Priority: empty/obsolete > stale > unknown > fresh
                const urgencyOrder = { empty: 4, obsolete: 3, stale: 2, unknown: 1, fresh: 0 };
                const worstStatus = urgencyOrder[libLoad] >= urgencyOrder[colLoad] ? libLoad : colLoad;

                const urgencyMap = {
                    empty: { icon: '🛑', text: 'Must act', color: 'text-red-600', tooltip: 'Please click to see required action(s)' },
                    obsolete: { icon: '🛑', text: 'Obsolete', color: 'text-red-600', tooltip: 'Please click to see required action(s)' },
                    stale: { icon: '⚠️', text: 'Stale', color: 'text-orange-600', tooltip: 'Please click to see suggested action(s)' },
                    unknown: { icon: '❓', text: 'Unknown', color: 'text-gray-500', tooltip: 'Please click to see available info' },
                    fresh: { icon: '✅', text: 'Fresh', color: 'text-green-700', tooltip: 'No actions required' }
                };

                return urgencyMap[worstStatus] || urgencyMap.unknown;
            };

            const renderStatusIndicator = () => {
                const urgency = getUrgencyInfo();
                const isLoading = syncStatus === 'loading';

                if (isLoading) {
                    return (
                        <span className="text-sm text-gray-500">
                            <span className="inline-block animate-spin mr-1">⏳</span>
                            Loading...
                        </span>
                    );
                }

                return (
                    <span
                        className={`text-sm ${urgency.color} status-indicator`}
                        onClick={() => setStatusModalOpen(true)}
                        title={urgency.tooltip}
                    >
                        <span className="mr-1">{urgency.icon}</span>
                        Data Status: {urgency.text}
                    </span>
                );
            };

            // v5.0.0-alpha.175.30 - Helper for status ball indicator in File menu
            const getStatusBall = () => {
                if (syncStatus === 'loading') return '⏳';
                const urgency = getUrgencyInfo();
                const ballMap = {
                    'Must act': '🔴',
                    'Obsolete': '🔴',
                    'Stale': '🟡',
                    'Unknown': '⚪',
                    'Fresh': '🟢'
                };
                return ballMap[urgency.text] || '⚪';
            };

            return (
                <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900"
                     onMouseMove={handleMouseMove}
                     onMouseUp={handleMouseUp}>
                    {/* v4.16.0.l - CSS for toast animation */}
                    {/* v4.16.0.m - 1.0s ease-in animation for gravity-like falling */}
                    {/* v4.16.0.p - Gray bg with dark text (was light blue) */}
                    <style>{`
                        .clipboard-toast {
                            position: fixed;
                            background: #f3f4f6;
                            color: #374151;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                            z-index: 9999;
                            transition: all 1.0s ease-in;
                        }

                        .clipboard-toast.animating {
                            background: transparent;
                            color: #6b7280;
                            box-shadow: none;
                            font-size: 12px;
                            padding: 0;
                        }
                    `}</style>
                    {/* v5.0.0-alpha.175.1 - Menu Bar (Phase 1 foundation) */}
                    <div style={{
                        height: '32px',
                        background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        gap: '2px'
                    }}>
                        {/* Logo + App Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '12px', marginRight: '4px', borderRight: '1px solid #cbd5e1' }}>
                            <img src="icons/ReaderWranglerWordlessXparent32.png" alt="" style={{ width: '20px', height: '20px' }} />
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', letterSpacing: '-0.02em' }}>
                                ReaderWrangler<span style={{ fontSize: '9px', verticalAlign: 'super', color: '#64748b' }}>™</span>
                            </span>
                        </div>
                        {/* v5.0.0-alpha.175.2 - File/View/Help menus */}
                        {['File', 'View', 'Help'].map(menuName => (
                            <div key={menuName} style={{ position: 'relative' }} data-menu-area="true">
                                <button
                                    data-menu-area="true"
                                    onMouseDown={() => setOpenMenuBar(openMenuBar === menuName.toLowerCase() ? null : menuName.toLowerCase())}
                                    onMouseEnter={() => openMenuBar && setOpenMenuBar(menuName.toLowerCase())}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: openMenuBar === menuName.toLowerCase() ? '#1e3a8a' : '#475569',
                                        background: openMenuBar === menuName.toLowerCase() ? '#dbeafe' : 'transparent',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background 0.1s'
                                    }}
                                >
                                    {menuName === 'File' ? (
                                        <>
                                            File <span style={{ fontSize: '11px', marginLeft: '2px' }}>{getStatusBall()}</span>
                                        </>
                                    ) : menuName}
                                </button>
                                {openMenuBar === menuName.toLowerCase() && (
                                    <div data-menu-area="true" style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        marginTop: '2px',
                                        minWidth: '200px',
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 1000,
                                        padding: '4px 0'
                                    }}>
                                        {menuName === 'File' && (
                                            <>
                                                {/* v5.0.0-alpha.175.30 - Data Status in File menu */}
                                                <button onClick={() => { setStatusModalOpen(true); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: getUrgencyInfo().color.replace('text-', '')
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    {getStatusBall()} Data Status: {getUrgencyInfo().text}
                                                </button>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                                <button onClick={() => { importLibrary(); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    Import Library…
                                                </button>
                                                <button onClick={() => { exportLibrary(); setOpenMenuBar(null); }} disabled={books.length === 0} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: books.length === 0 ? 'not-allowed' : 'pointer',
                                                    transition: 'background 0.1s', color: books.length === 0 ? '#94a3b8' : '#1e293b',
                                                    opacity: books.length === 0 ? 0.5 : 1
                                                }} onMouseEnter={e => books.length > 0 && (e.currentTarget.style.background = '#f1f5f9')} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    Export Library…
                                                </button>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                                {/* v5.1.0-alpha.2 - Auto-Organize wizard */}
                                                <button onClick={() => { setWizardModalOpen(true); setOpenMenuBar(null); }} disabled={books.length === 0} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: books.length === 0 ? 'not-allowed' : 'pointer',
                                                    transition: 'background 0.1s', color: books.length === 0 ? '#94a3b8' : '#1e293b',
                                                    opacity: books.length === 0 ? 0.5 : 1
                                                }} onMouseEnter={e => books.length > 0 && (e.currentTarget.style.background = '#f1f5f9')} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    🪄 Auto-Organize…
                                                </button>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                                <button onClick={() => { setResetConfirmOpen(true); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#dc2626'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    Reset App
                                                </button>
                                            </>
                                        )}
                                        {menuName === 'View' && (
                                            <>
                                                <button onClick={() => { setExplorerView('list'); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px 8px 32px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b', position: 'relative'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    {explorerView === 'list' && <span style={{ position: 'absolute', left: '12px' }}>✓</span>}
                                                    List View
                                                </button>
                                                <button onClick={() => { setExplorerView('covers'); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px 8px 32px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b', position: 'relative'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    {explorerView === 'covers' && <span style={{ position: 'absolute', left: '12px' }}>✓</span>}
                                                    Cover View
                                                </button>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                                <button onClick={() => { setShowHidden(!showHidden); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px 8px 32px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b', position: 'relative'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    {showHidden && <span style={{ position: 'absolute', left: '12px' }}>✓</span>}
                                                    Show Hidden
                                                </button>
                                                <button onClick={() => { setDealsFilterActive(!dealsFilterActive); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px 8px 32px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b', position: 'relative'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    {dealsFilterActive && <span style={{ position: 'absolute', left: '12px' }}>✓</span>}
                                                    Deals Only
                                                </button>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />                                                <button onClick={() => { setTagManagementOpen(true); setOpenMenuBar(null); }} style={{                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',                                                    border: 'none', background: 'white', cursor: 'pointer',                                                    transition: 'background 0.1s', color: '#1e293b'                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>                                                    Manage Tags...                                                </button>
                                            </>
                                        )}
                                        {menuName === 'Help' && (
                                            <>
                                                <button onClick={() => { setHowToDialogOpen(true); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    How To Use
                                                </button>
                                                <button onClick={() => { setShortcutsDialogOpen(true); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    Keyboard Shortcuts
                                                </button>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                                <button onClick={() => { setAboutDialogOpen(true); setOpenMenuBar(null); }} style={{
                                                    width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px',
                                                    border: 'none', background: 'white', cursor: 'pointer',
                                                    transition: 'background 0.1s', color: '#1e293b'
                                                }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    About ReaderWrangler™
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* v5.0.0-alpha.175.3 - Toolbar (Phase 3 foundation) */}
                    <div style={{
                        height: '36px',
                        background: 'white',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        gap: '12px'
                    }}>
                        {/* Search input */}
                        <div style={{ position: 'relative', flex: '0 0 300px' }}>
                            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>🔍</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Title or author..."
                                style={{
                                    width: '100%',
                                    height: '28px',
                                    padding: '0 28px 0 28px',
                                    fontSize: '13px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        position: 'absolute',
                                        right: '6px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748b',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        padding: '0 4px',
                                        lineHeight: '1'
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#1e293b'}
                                    onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {/* v5.0.0-alpha.175.4 - Toolbar Tier 1 Filters */}

                        {/* Status Filter */}
                        <div style={{ position: 'relative' }} data-status-dropdown="">
                            <button
                                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                style={{
                                    height: '28px',
                                    padding: '0 10px',
                                    fontSize: '13px',
                                    border: '1px solid',
                                    borderColor: readStatusFilter ? '#93c5fd' : '#cbd5e1',
                                    borderRadius: '4px',
                                    background: readStatusFilter ? '#dbeafe' : 'white',
                                    color: readStatusFilter ? '#1e40af' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: readStatusFilter ? 500 : 400,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {readStatusFilter === 'READ' && '✓ Read'}
                                {readStatusFilter === 'UNREAD' && '○ Unread'}
                                {readStatusFilter === 'UNKNOWN' && '? Unknown'}
                                {!readStatusFilter && 'Read Status'}
                            </button>
                            {statusDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '32px',
                                    left: 0,
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    minWidth: '140px'
                                }}>
                                    <div
                                        onClick={() => { setReadStatusFilter(''); setStatusDropdownOpen(false); }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: !readStatusFilter ? '#f1f5f9' : 'white'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.target.style.background = !readStatusFilter ? '#f1f5f9' : 'white'}
                                    >
                                        All Status
                                    </div>
                                    <div
                                        onClick={() => { setReadStatusFilter('READ'); setStatusDropdownOpen(false); }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: readStatusFilter === 'READ' ? '#f1f5f9' : 'white'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.target.style.background = readStatusFilter === 'READ' ? '#f1f5f9' : 'white'}
                                    >
                                        ✓ Read
                                    </div>
                                    <div
                                        onClick={() => { setReadStatusFilter('UNREAD'); setStatusDropdownOpen(false); }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: readStatusFilter === 'UNREAD' ? '#f1f5f9' : 'white'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.target.style.background = readStatusFilter === 'UNREAD' ? '#f1f5f9' : 'white'}
                                    >
                                        ○ Unread
                                    </div>
                                    <div
                                        onClick={() => { setReadStatusFilter('UNKNOWN'); setStatusDropdownOpen(false); }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: readStatusFilter === 'UNKNOWN' ? '#f1f5f9' : 'white'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.target.style.background = readStatusFilter === 'UNKNOWN' ? '#f1f5f9' : 'white'}
                                    >
                                        ? Unknown
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tags Filter */}
                        <div style={{ position: 'relative' }} data-tags-dropdown="">
                            <button
                                onClick={() => setTagsDropdownOpen(!tagsDropdownOpen)}
                                style={{
                                    height: '28px',
                                    padding: '0 10px',
                                    fontSize: '13px',
                                    border: '1px solid',
                                    borderColor: tagFilter.length > 0 ? '#93c5fd' : '#cbd5e1',
                                    borderRadius: '4px',
                                    background: tagFilter.length > 0 ? '#dbeafe' : 'white',
                                    color: tagFilter.length > 0 ? '#1e40af' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: tagFilter.length > 0 ? 500 : 400,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tagFilter.length > 0 ? `Tags (${tagFilter.length})` : 'Tags'}
                            </button>
                            {tagsDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '32px',
                                    left: 0,
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    minWidth: '200px',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}>
                                    {Object.keys(tagRegistry).length === 0 ? (
                                        <div style={{ padding: '8px 12px', fontSize: '13px', color: '#94a3b8' }}>
                                            No tags available
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                onClick={() => setTagFilter([])}
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    background: tagFilter.length === 0 ? '#f1f5f9' : 'white',
                                                    borderBottom: '1px solid #e2e8f0'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                                onMouseLeave={(e) => e.target.style.background = tagFilter.length === 0 ? '#f1f5f9' : 'white'}
                                            >
                                                Clear All
                                            </div>
                                            {Object.entries(tagRegistry)
                                                .sort(([a], [b]) => a.localeCompare(b))
                                                .map(([tagName, tagData]) => (
                                                    <div
                                                        key={tagName}
                                                        onClick={() => {
                                                            if (tagFilter.includes(tagName)) {
                                                                setTagFilter(tagFilter.filter(t => t !== tagName));
                                                            } else {
                                                                setTagFilter([...tagFilter, tagName]);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '8px 12px',
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            background: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                                        onMouseLeave={(e) => e.target.style.background = 'white'}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={tagFilter.includes(tagName)}
                                                            onChange={() => {}}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <span style={{ flex: 1 }}>{tagData.label}</span>
                                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                                            {getTagCount(tagName)}
                                                        </span>
                                                    </div>
                                                ))
                                            }
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Types Filter */}
                        <div style={{ position: 'relative' }} data-types-dropdown="">
                            <button
                                onClick={() => setTypesDropdownOpen(!typesDropdownOpen)}
                                style={{
                                    height: '28px',
                                    padding: '0 10px',
                                    fontSize: '13px',
                                    border: '1px solid',
                                    borderColor: ownershipFilter ? '#93c5fd' : '#cbd5e1',
                                    borderRadius: '4px',
                                    background: ownershipFilter ? '#dbeafe' : 'white',
                                    color: ownershipFilter ? '#1e40af' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: ownershipFilter ? 500 : 400,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {ownershipFilter ?
                                    (() => {
                                        const labels = {
                                            'wishlist': 'Wishlist',
                                            'purchased': 'Purchased',
                                            'sample': 'Sample',
                                            'borrowed': 'Borrowed',
                                            'prime': 'Prime',
                                            'kindleUnlimited': 'Kindle Unlimited',
                                            'koll': 'KOLL',
                                            'comixology': 'Comixology'
                                        };
                                        return labels[ownershipFilter] || ownershipFilter;
                                    })()
                                    : 'Source'
                                }
                            </button>
                            {typesDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '32px',
                                    left: 0,
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    minWidth: '160px'
                                }}>
                                    <div
                                        onClick={() => { setOwnershipFilter(''); setTypesDropdownOpen(false); }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: !ownershipFilter ? '#f1f5f9' : 'white'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.target.style.background = !ownershipFilter ? '#f1f5f9' : 'white'}
                                    >
                                        All Types
                                    </div>
                                    {[
                                        { value: 'wishlist', label: 'Wishlist' },
                                        { value: 'purchased', label: 'Purchased' },
                                        { value: 'sample', label: 'Sample' },
                                        { value: 'borrowed', label: 'Borrowed' },
                                        { value: 'prime', label: 'Prime' },
                                        { value: 'kindleUnlimited', label: 'Kindle Unlimited' },
                                        { value: 'koll', label: 'KOLL' },
                                        { value: 'comixology', label: 'Comixology' }
                                    ].map(type => (
                                        <div
                                            key={type.value}
                                            onClick={() => { setOwnershipFilter(type.value); setTypesDropdownOpen(false); }}
                                            style={{
                                                padding: '8px 12px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                background: ownershipFilter === type.value ? '#f1f5f9' : 'white'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                            onMouseLeave={(e) => e.target.style.background = ownershipFilter === type.value ? '#f1f5f9' : 'white'}
                                        >
                                            {type.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* v5.0.0-alpha.175.40 - Phase 5.1: More button */}
                        <button
                            data-morepanel="true"
                            onClick={() => setMorePanelOpen(!morePanelOpen)}
                            className={`px-3 py-1.5 rounded border ${morePanelOpen
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                            style={{
                                fontSize: '13px',
                                height: '28px',
                                marginLeft: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                            More {morePanelOpen ? '▲' : '▼'}
                        </button>

                        {/* Book count - positioned next to filters for immediate visual feedback */}
                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500, marginLeft: '12px' }}>
                            {(() => {
                                // Compute filtered book count based on all active filters
                                let filtered = books;

                                // Search filter
                                if (searchTerm) {
                                    const term = searchTerm.toLowerCase();
                                    filtered = filtered.filter(book =>
                                        book.title?.toLowerCase().includes(term) ||
                                        book.author?.toLowerCase().includes(term)
                                    );
                                }

                                // Read status filter
                                if (readStatusFilter) {
                                    filtered = filtered.filter(book => {
                                        const status = book.readStatus || 'unknown';
                                        return status === readStatusFilter;
                                    });
                                }

                                // Collection filter
                                if (collectionFilter) {
                                    filtered = filtered.filter(book => {
                                        if (collectionFilter === 'UNCOLLECTED') {
                                            return !book.collections || book.collections.length === 0;
                                        }
                                        return book.collections?.includes(collectionFilter);
                                    });
                                }

                                // Collections filter (v5.0.0-alpha.175.41 - Phase 5.2: Multi-select)
                                if (selectedCollections.length > 0) {
                                    filtered = filtered.filter(book => {
                                        const hasUncollected = selectedCollections.includes('UNCOLLECTED');
                                        const otherCollections = selectedCollections.filter(c => c !== 'UNCOLLECTED');

                                        const bookCollections = book.collections || [];
                                        const isInCollection = otherCollections.some(c =>
                                            bookCollections.some(bc => bc.name === c)
                                        );
                                        const isUncollected = bookCollections.length === 0;

                                        return (hasUncollected && isUncollected) || isInCollection;
                                    });
                                }

                                // Amazon Rating filter (v5.0.0-alpha.175.42 - Phase 5.3: Minimum rating)
                                if (minAmazonRating) {
                                    filtered = filtered.filter(book => {
                                        return book.rating !== undefined && book.rating >= parseFloat(minAmazonRating);
                                    });
                                }

                                // My Rating filter (v5.0.0-alpha.175.43 - Phase 5.4: Personal rating with Unrated option)
                                if (minMyRating) {
                                    filtered = filtered.filter(book => {
                                        if (minMyRating === 'unrated') {
                                            return (book.myRating || 0) === 0;
                                        } else {
                                            const minRating = parseFloat(minMyRating);
                                            return (book.myRating || 0) >= minRating;
                                        }
                                    });
                                }

                                // Rating filter
                                if (ratingFilter) {
                                    filtered = filtered.filter(book => {
                                        const rating = book.rating || 0;
                                        return rating >= parseInt(ratingFilter);
                                    });
                                }

                                // Ownership filter
                                if (ownershipFilter) {
                                    filtered = filtered.filter(book => {
                                        return book.ownershipType === ownershipFilter || book.ownership === ownershipFilter;
                                    });
                                }

                                // Series filter
                                if (seriesFilter) {
                                    filtered = filtered.filter(book => {
                                        if (seriesFilter === 'NOT_IN_SERIES') {
                                            return !book.series || book.series === '';
                                        }
                                        return book.series === seriesFilter;
                                    });
                                }

                                // Tag filter (v4.27.0)
                                if (tagFilter && tagFilter.length > 0) {
                                    filtered = filtered.filter(book => {
                                        return tagFilter.some(tag => book.tags?.includes(tag));
                                    });
                                }

                                // Series filter (v5.0.0-alpha.175.44 - Phase 5.5: Multi-select with NOT_IN_SERIES)
                                if (selectedSeries.length > 0) {
                                    filtered = filtered.filter(book => {
                                        const hasNotInSeries = selectedSeries.includes('NOT_IN_SERIES');
                                        const otherSeries = selectedSeries.filter(s => s !== 'NOT_IN_SERIES');

                                        const bookSeries = book.series || '';
                                        const isInSeries = otherSeries.includes(bookSeries);
                                        const isNotInSeries = !bookSeries || bookSeries.trim() === '';

                                        return (hasNotInSeries && isNotInSeries) || isInSeries;
                                    });
                                }

                                // Date filter
                                if (dateFrom || dateTo) {
                                    filtered = filtered.filter(book => {
                                        const purchaseDate = book.purchaseDate ? new Date(book.purchaseDate) : null;
                                        if (!purchaseDate) return false;
                                        if (dateFrom && purchaseDate < new Date(dateFrom)) return false;
                                        if (dateTo && purchaseDate > new Date(dateTo)) return false;
                                        return true;
                                    });
                                }

                                // Show hidden filter
                                if (!showHidden) {
                                    filtered = filtered.filter(book => !book.hidden);
                                }

                                // Deals filter (v4.17.0.j)
                                if (dealsFilterActive) {
                                    filtered = filtered.filter(book => book.isDeal);
                                }

                                return `${filtered.length} of ${books.length}`;
                            })()}
                        </div>

                        {/* v5.0.0-alpha.175.46 - Phase 6: Toolbar View Controls */}

                        {/* Show Hidden toggle */}
                        <label
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border cursor-pointer ${
                                showHidden
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            style={{ fontSize: '13px', height: '28px', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                            <input
                                type="checkbox"
                                checked={showHidden}
                                onChange={(e) => setShowHidden(e.target.checked)}
                                style={{ marginRight: '2px' }}
                            />
                            <span>Show Hidden</span>
                        </label>

                        {/* Deals toggle with badge count */}
                        <label
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border cursor-pointer ${
                                dealsFilterActive
                                    ? 'bg-green-50 border-green-300 text-green-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            style={{ fontSize: '13px', height: '28px', marginLeft: '8px', whiteSpace: 'nowrap' }}
                            title="Show only books at or below your target price">
                            <input
                                type="checkbox"
                                checked={dealsFilterActive}
                                onChange={(e) => setDealsFilterActive(e.target.checked)}
                                style={{ marginRight: '2px' }}
                            />
                            <span>
                                Deals only ({books.filter(b => b.priceTrigger != null && b.currentPrice != null && b.currentPrice <= b.priceTrigger).length})
                            </span>
                        </label>

                        {/* List/Covers toggle - segmented button */}
                        <div
                            style={{
                                display: 'inline-flex',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginLeft: '8px',
                                height: '28px'
                            }}>
                            <button
                                onClick={() => setExplorerView('list')}
                                className={`px-3 py-1 border-r border-gray-300 ${
                                    explorerView === 'list'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                                style={{ fontSize: '18px', cursor: 'pointer', lineHeight: '1' }}
                                title="List view">
                                ≡
                            </button>
                            <button
                                onClick={() => setExplorerView('covers')}
                                className={`px-3 py-1 ${
                                    explorerView === 'covers'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                                style={{ fontSize: '18px', cursor: 'pointer', lineHeight: '1' }}
                                title="Cover view">
                                ⊞
                            </button>
                        </div>

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />
                    </div>

                    {/* v5.0.0-alpha.175.40 - Phase 5.1: More panel (Tier 2 filters) */}
                    {morePanelOpen && (
                        <div
                            data-morepanel="true"
                            style={{
                                position: 'absolute',
                                top: '64px',  // Below toolbar (32px menu + 36px toolbar - 4px overlap)
                                left: '16px',
                                minWidth: '500px',
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                padding: '16px',
                                zIndex: 1000
                            }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px'
                            }}>
                                {/* v5.0.0-alpha.175.41 - Phase 5.2: Collections Filter */}
                                <div style={{ position: 'relative' }} data-collections-dropdown="">
                                    <button
                                        onClick={() => setCollectionsDropdownOpen(!collectionsDropdownOpen)}
                                        className={`w-full px-3 py-1.5 rounded border text-left flex justify-between items-center ${
                                            selectedCollections.length > 0
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                        style={{ fontSize: '13px', height: '28px' }}>
                                        <span>
                                            Collections
                                            {selectedCollections.length > 0 && ` (${selectedCollections.length})`}
                                        </span>
                                        <span>{collectionsDropdownOpen ? '▲' : '▼'}</span>
                                    </button>

                                    {collectionsDropdownOpen && (
                                        <div
                                            data-morepanel="true"
                                            style={{
                                                position: 'absolute',
                                                top: '32px',
                                                left: 0,
                                                minWidth: '200px',
                                                maxHeight: '300px',
                                                overflowY: 'auto',
                                                background: 'white',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                padding: '8px',
                                                zIndex: 1001
                                            }}>
                                            {/* UNCOLLECTED option */}
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCollections.includes('UNCOLLECTED')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedCollections([...selectedCollections, 'UNCOLLECTED']);
                                                        } else {
                                                            setSelectedCollections(selectedCollections.filter(c => c !== 'UNCOLLECTED'));
                                                        }
                                                    }}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                <span style={{ fontStyle: 'italic', color: '#64748b' }}>
                                                    (Not in collection)
                                                </span>
                                            </label>

                                            {/* Collection options */}
                                            {getAllCollectionNames().map(collection => (
                                                <label
                                                    key={collection}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '6px 8px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px'
                                                    }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCollections.includes(collection)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedCollections([...selectedCollections, collection]);
                                                            } else {
                                                                setSelectedCollections(selectedCollections.filter(c => c !== collection));
                                                            }
                                                        }}
                                                        style={{ marginRight: '8px' }}
                                                    />
                                                    {collection}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* v5.0.0-alpha.175.42 - Phase 5.3: Amazon Rating Filter */}
                                <div style={{ position: 'relative' }} data-amazon-rating-dropdown="">
                                    <button
                                        onClick={() => setAmazonRatingDropdownOpen(!amazonRatingDropdownOpen)}
                                        className={`w-full px-3 py-1.5 rounded border text-left flex justify-between items-center ${
                                            minAmazonRating
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                        style={{ fontSize: '13px', height: '28px' }}>
                                        <span>
                                            {minAmazonRating ? `Amazon ${minAmazonRating}+★` : 'Amazon Rating'}
                                        </span>
                                        <span>{amazonRatingDropdownOpen ? '▲' : '▼'}</span>
                                    </button>

                                    {amazonRatingDropdownOpen && (
                                        <div
                                            data-morepanel="true"
                                            style={{
                                                position: 'absolute',
                                                top: '32px',
                                                left: 0,
                                                minWidth: '160px',
                                                background: 'white',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                padding: '4px',
                                                zIndex: 1001
                                            }}>
                                            {['', '5', '4', '3', '2', '1'].map(rating => (
                                                <button
                                                    key={rating}
                                                    onClick={() => {
                                                        setMinAmazonRating(rating);
                                                        setAmazonRatingDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded"
                                                    style={{ fontSize: '13px' }}>
                                                    {rating ? `${rating}+ Stars` : 'All Ratings'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* v5.0.0-alpha.175.43 - Phase 5.4: My Rating Filter */}
                                <div style={{ position: 'relative' }} data-my-rating-dropdown="">
                                    <button
                                        onClick={() => setMyRatingDropdownOpen(!myRatingDropdownOpen)}
                                        className={`w-full px-3 py-1.5 rounded border text-left flex justify-between items-center ${
                                            minMyRating
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                        style={{ fontSize: '13px', height: '28px' }}>
                                        <span>
                                            {minMyRating === 'unrated' ? 'My: Unrated' : minMyRating ? `My ${minMyRating}+★` : 'My Rating'}
                                        </span>
                                        <span>{myRatingDropdownOpen ? '▲' : '▼'}</span>
                                    </button>

                                    {myRatingDropdownOpen && (
                                        <div
                                            data-morepanel="true"
                                            style={{
                                                position: 'absolute',
                                                top: '32px',
                                                left: 0,
                                                minWidth: '160px',
                                                background: 'white',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                padding: '4px',
                                                zIndex: 1001
                                            }}>
                                            <button
                                                onClick={() => {
                                                    setMinMyRating('');
                                                    setMyRatingDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded"
                                                style={{ fontSize: '13px' }}>
                                                All
                                            </button>
                                            {['5', '4', '3', '2', '1'].map(rating => (
                                                <button
                                                    key={rating}
                                                    onClick={() => {
                                                        setMinMyRating(rating);
                                                        setMyRatingDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded"
                                                    style={{ fontSize: '13px' }}>
                                                    {rating}+ Stars
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    setMinMyRating('unrated');
                                                    setMyRatingDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded"
                                                style={{ fontSize: '13px', fontStyle: 'italic', color: '#64748b' }}>
                                                Unrated
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* v5.0.0-alpha.175.44 - Phase 5.5: Series Filter (column 1, row 2) */}
                                <div style={{ position: 'relative' }} data-series-dropdown="">
                                    <button
                                        onClick={() => setSeriesDropdownOpen(!seriesDropdownOpen)}
                                        className={`w-full px-3 py-1.5 rounded border text-left flex justify-between items-center ${
                                            selectedSeries.length > 0
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                        style={{ fontSize: '13px', height: '28px' }}>
                                        <span>
                                            Series{selectedSeries.length > 0 && ` (${selectedSeries.length})`}
                                        </span>
                                        <span>{seriesDropdownOpen ? '▲' : '▼'}</span>
                                    </button>

                                    {seriesDropdownOpen && (
                                        <div
                                            data-morepanel="true"
                                            style={{
                                                position: 'absolute',
                                                top: '32px',
                                                left: 0,
                                                minWidth: '250px',
                                                maxHeight: '300px',
                                                overflowY: 'auto',
                                                background: 'white',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                padding: '8px',
                                                zIndex: 1001
                                            }}>
                                            {/* NOT_IN_SERIES option */}
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSeries.includes('NOT_IN_SERIES')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedSeries([...selectedSeries, 'NOT_IN_SERIES']);
                                                        } else {
                                                            setSelectedSeries(selectedSeries.filter(s => s !== 'NOT_IN_SERIES'));
                                                        }
                                                    }}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                <span style={{ fontStyle: 'italic', color: '#64748b' }}>
                                                    (Not in series)
                                                </span>
                                            </label>

                                            {/* Series options */}
                                            {getAllSeriesNames().map(series => (
                                                <label
                                                    key={series}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '6px 8px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px'
                                                    }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSeries.includes(series)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedSeries([...selectedSeries, series]);
                                                            } else {
                                                                setSelectedSeries(selectedSeries.filter(s => s !== series));
                                                            }
                                                        }}
                                                        style={{ marginRight: '8px' }}
                                                    />
                                                    {series}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* v5.0.0-alpha.175.45 - Phase 5.6: Date Filter (spans columns 2-3, row 2) */}
                                <div style={{ position: 'relative', gridColumn: '2 / 4' }} data-date-dropdown="">
                                    <button
                                        onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                                        className={`w-full px-3 py-1.5 rounded border text-left flex justify-between items-center ${
                                            datePreset
                                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                        style={{ fontSize: '13px', height: '28px' }}>
                                        <span>
                                            {datePreset === 'custom' && (dateFrom || dateTo)
                                                ? `${dateFrom || '...'} to ${dateTo || '...'}`
                                                : datePreset === 'last30' ? 'Last 30 days'
                                                : datePreset === 'last90' ? 'Last 90 days'
                                                : datePreset === 'lastYear' ? 'Last 12 months'
                                                : datePreset === 'year2026' ? 'This year (2026)'
                                                : datePreset === 'year2025' ? 'Last year (2025)'
                                                : datePreset === 'year2024' ? '2024'
                                                : datePreset === 'year2023' ? '2023'
                                                : 'Date Added'}
                                        </span>
                                        <span>{dateDropdownOpen ? '▲' : '▼'}</span>
                                    </button>

                                    {dateDropdownOpen && (
                                        <div
                                            data-morepanel="true"
                                            style={{
                                                position: 'absolute',
                                                top: '32px',
                                                left: 0,
                                                right: 0,
                                                background: 'white',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,1,0.1)',
                                                padding: '8px',
                                                zIndex: 1001
                                            }}>
                                            {/* Preset options */}
                                            {[
                                                { value: 'last30', label: 'Last 30 days' },
                                                { value: 'last90', label: 'Last 90 days' },
                                                { value: 'lastYear', label: 'Last 12 months' },
                                                { value: 'year2026', label: 'This year (2026)' },
                                                { value: 'year2025', label: 'Last year (2025)' },
                                                { value: 'year2024', label: '2024' },
                                                { value: 'year2023', label: '2023' },
                                                { value: 'custom', label: 'Custom range...' }
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setDatePreset(option.value);
                                                        if (option.value !== 'custom') {
                                                            setDateDropdownOpen(false);
                                                        }
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded"
                                                    style={{ fontSize: '13px' }}>
                                                    {option.label}
                                                </button>
                                            ))}

                                            {/* Custom date inputs */}
                                            {datePreset === 'custom' && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '8px',
                                                    borderTop: '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>From:</label>
                                                        <input
                                                            type="date"
                                                            value={dateFrom}
                                                            onChange={(e) => setDateFrom(e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px 8px',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '4px',
                                                                fontSize: '13px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>To:</label>
                                                        <input
                                                            type="date"
                                                            value={dateTo}
                                                            onChange={(e) => setDateTo(e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px 8px',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '4px',
                                                                fontSize: '13px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{
                                                        marginTop: '8px',
                                                        display: 'flex',
                                                        gap: '8px'
                                                    }}>
                                                        <button
                                                            onClick={() => setDateDropdownOpen(false)}
                                                            className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                            style={{ fontSize: '12px' }}>
                                                            Apply
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDatePreset('');
                                                                setDateFrom('');
                                                                setDateTo('');
                                                                setDateDropdownOpen(false);
                                                            }}
                                                            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
                                                            style={{ fontSize: '12px' }}>
                                                            Clear
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.0.0-alpha.175.47 - Phase 7: Old filter panel removed (replaced by toolbar in Phases 3-6) */}

                    {/* Active Filters Banner (v3.8.0.k - moved below Filter Panel, v4.15.6.m - use datePreset, v4.27.0 - add tagFilter, v5.0.0-alpha.175.41 - add selectedCollections, v5.0.0-alpha.175.42 - add minAmazonRating, v5.0.0-alpha.175.43 - add minMyRating, v5.0.0-alpha.175.44 - add selectedSeries, v5.0.0-alpha.175.47 - restored after Phase 7 cleanup, v5.0.0-alpha.175.49.2 - Clear All button floats near filters instead of far right) */}
                    {(searchTerm || readStatusFilter || collectionFilter || ratingFilter || ownershipFilter || seriesFilter || datePreset || (tagFilter && tagFilter.length > 0) || selectedCollections.length > 0 || minAmazonRating || minMyRating || selectedSeries.length > 0) && (
                        <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2 mb-4 flex items-center gap-2 flex-wrap text-sm">
                            <span className="font-semibold">🔍 Active:</span>
                                {searchTerm && <span>Search: "{searchTerm}"</span>}
                                {searchTerm && (readStatusFilter || collectionFilter || ratingFilter || seriesFilter || datePreset || tagFilter?.length > 0 || selectedCollections.length > 0) && <span>|</span>}
                                {readStatusFilter && <span>Read: {readStatusFilter}</span>}
                                {readStatusFilter && (collectionFilter || ratingFilter || seriesFilter || datePreset || tagFilter?.length > 0 || selectedCollections.length > 0) && <span>|</span>}
                                {collectionFilter && <span>Collection: {collectionFilter === 'UNCOLLECTED' ? 'Uncollected' : collectionFilter}</span>}
                                {collectionFilter && (ratingFilter || seriesFilter || datePreset || tagFilter?.length > 0 || selectedCollections.length > 0) && <span>|</span>}
                                {ratingFilter && <span>Rating: {ratingFilter}+★</span>}
                                {ratingFilter && (ownershipFilter || seriesFilter || datePreset || tagFilter?.length > 0 || selectedCollections.length > 0) && <span>|</span>}
                                {ownershipFilter && <span>Ownership: {ownershipFilter === 'kindleUnlimited' ? 'Kindle Unlimited' : ownershipFilter.charAt(0).toUpperCase() + ownershipFilter.slice(1)}</span>}
                                {ownershipFilter && (seriesFilter || datePreset || tagFilter?.length > 0 || selectedCollections.length > 0) && <span>|</span>}
                                {seriesFilter && <span>Series: {seriesFilter === 'NOT_IN_SERIES' ? 'Not in Series' : seriesFilter}</span>}
                                {seriesFilter && (datePreset || tagFilter?.length > 0 || selectedCollections.length > 0) && <span>|</span>}
                                {datePreset && <span>Date: {
                                    datePreset === 'custom' ? `${dateFrom || '...'} to ${dateTo || '...'}` :
                                    datePreset === 'last30' ? 'Last 30 Days' :
                                    datePreset === 'last90' ? 'Last 90 Days' :
                                    datePreset === 'lastYear' ? 'Last 12 Months' :
                                    datePreset.startsWith('year') ? datePreset.substring(4) :
                                    datePreset
                                }</span>}
                                {datePreset && (tagFilter?.length > 0 || selectedCollections.length > 0 || minAmazonRating || minMyRating || selectedSeries.length > 0) && <span>|</span>}
                                {tagFilter && tagFilter.length > 0 && <span>Tags: {tagFilter.map(t => tagRegistry[t]?.label || t).join(', ')}</span>}
                                {/* v5.0.0-alpha.175.41 - Phase 5.2: More panel filters */}
                                {tagFilter?.length > 0 && (selectedCollections.length > 0 || minAmazonRating) && <span>|</span>}
                                {selectedCollections.length > 0 && <span>Collections: {selectedCollections.map(c => c === 'UNCOLLECTED' ? 'Uncollected' : c).join(', ')}</span>}
                                {/* v5.0.0-alpha.175.42 - Phase 5.3: Amazon Rating filter */}
                                {selectedCollections.length > 0 && (minAmazonRating || minMyRating) && <span>|</span>}
                                {minAmazonRating && <span>Amazon Rating: {minAmazonRating}+★</span>}
                                {/* v5.0.0-alpha.175.43 - Phase 5.4: My Rating filter */}
                                {minAmazonRating && minMyRating && <span>|</span>}
                                {minMyRating && <span>My Rating: {minMyRating === 'unrated' ? 'Unrated' : `${minMyRating}+★`}</span>}
                                {/* v5.0.0-alpha.175.44 - Phase 5.5: Series filter */}
                                {minMyRating && selectedSeries.length > 0 && <span>|</span>}
                                {selectedSeries.length > 0 && <span>Series: {selectedSeries.map(s => s === 'NOT_IN_SERIES' ? 'Not in series' : s).join(', ')}</span>}
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setReadStatusFilter('');
                                    setCollectionFilter('');
                                    setRatingFilter('');
                                    setOwnershipFilter('');
                                    setSeriesFilter('');
                                    setDatePreset('');
                                    setDateFrom('');
                                    setDateTo('');
                                    setTagFilter([]);
                                    setSelectedCollections([]); // v5.0.0-alpha.175.41 - Clear Collections filter
                                    setMinAmazonRating(''); // v5.0.0-alpha.175.42 - Clear Amazon Rating filter
                                    setMinMyRating(''); // v5.0.0-alpha.175.43 - Clear My Rating filter
                                    setSelectedSeries([]); // v5.0.0-alpha.175.44 - Clear Series filter
                                }}
                                className="text-blue-700 hover:text-white hover:bg-blue-600 font-semibold text-sm whitespace-nowrap px-2 py-1 rounded border border-blue-400 bg-white"
                                style={{ marginLeft: '12px' }}>
                                Clear All ×
                            </button>
                        </div>
                    )}

                    {statusModalOpen && (() => {
                        // Schema v2.0: Simplified informational modal (no action buttons)
                        // Count dividers in columns - dividers are stored as objects {type: 'divider', id, label}
                        const dividerCount = columns.reduce((count, col) =>
                            count + col.books.filter(item => typeof item === 'object' && item.type === 'divider').length, 0);
                        const booksWithCollections = books.filter(b => b.collections && b.collections.length > 0).length;

                        return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setStatusModalOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                {/* Header */}
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Data Status</h2>
                                    <button onClick={() => setStatusModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                </div>

                                {/* Content - informational only */}
                                <div className="p-6 space-y-4">
                                    {/* Library info - v4.15.1.c: Red text for non-fresh status */}
                                    <div className="border-b border-gray-200 pb-3">
                                        <p className="text-sm text-gray-700">
                                            📚 <strong>Library:</strong> {books.length > 0
                                                ? `${books.length} books`
                                                : <span className="text-red-600 font-medium">Not loaded</span>}
                                        </p>
                                        {libraryStatus.loadDate && (
                                            <p className={`text-xs mt-1 ${libraryStatus.loadStatus === 'fresh' ? 'text-gray-500' : libraryStatus.loadStatus === 'stale' ? 'text-orange-500' : 'text-red-500'}`}>
                                                Fetched: {new Date(libraryStatus.loadDate).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Collections info - v4.15.1.c: Red text for non-fresh status */}
                                    <div className="border-b border-gray-200 pb-3">
                                        <p className="text-sm text-gray-700">
                                            📁 <strong>Collections:</strong> {booksWithCollections > 0
                                                ? `${booksWithCollections} books with collection data`
                                                : <span className="text-red-600 font-medium">Not loaded</span>}
                                        </p>
                                        {collectionsStatus.loadDate && (
                                            <p className={`text-xs mt-1 ${collectionsStatus.loadStatus === 'fresh' ? 'text-gray-500' : collectionsStatus.loadStatus === 'stale' ? 'text-orange-500' : 'text-red-500'}`}>
                                                Fetched: {new Date(collectionsStatus.loadDate).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Organization stats */}
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            📊 <strong>Organization:</strong> {columns.length} column{columns.length !== 1 ? 's' : ''}, {dividerCount} divider{dividerCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    {/* Help text */}
                                    {books.length === 0 && (
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                            <p>Use the <strong>Import</strong> button to load your library file.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {resetConfirmOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setResetConfirmOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Reset App Confirmation</h2>
                                    <button onClick={() => setResetConfirmOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-gray-800 font-semibold">This will completely reset the app to its initial unused state.</p>
                                    <div className="text-gray-700">
                                        <p className="font-semibold mb-2">This will:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Unload library and collections</li>
                                            <li>Remove all columns and organization</li>
                                            <li>Reset all filters</li>
                                        </ul>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                        <p className="mb-2">Your library/collections files on disk will NOT be deleted. You can reload them anytime.</p>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm">
                                        <p className="font-semibold text-gray-800">💡 Tip: Use the Export button first to save your organization before resetting.</p>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <button
                                            onClick={() => setResetConfirmOpen(false)}
                                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmReset}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                                            Reset App
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.0.0-alpha.175.2 - About Dialog */}
                    {aboutDialogOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setAboutDialogOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">About ReaderWrangler™</h2>
                                    <button onClick={() => setAboutDialogOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                </div>
                                <div className="p-6 space-y-4 text-center">
                                    <img src="icons/ReaderWranglerXparent.png" alt="ReaderWrangler" style={{ width: '200px', height: '200px', margin: '0 auto' }} />
                                    <p className="text-sm text-gray-600">Wrangle your Kindle library with power and precision</p>
                                    <div className="text-sm text-gray-700 border-t border-gray-200 pt-4">
                                        <p className="font-semibold">Version {APP_VERSION}</p>
                                        <p className="mt-2">Copyright © 2025, 2026 <a href="https://AlloidLabs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">AlloidLabs.com</a></p>
                                    </div>
                                    <div className="text-sm text-gray-600 border-t border-gray-200 pt-4 text-left">
                                        <p>ReaderWrangler is a powerful organizer for your Kindle library. Import your library from Amazon, organize books into folders and collections, and filter by status/rating/tags.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.0.0-alpha.175.2 - Keyboard Shortcuts Dialog */}
                    {shortcutsDialogOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShortcutsDialogOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
                                    <button onClick={() => setShortcutsDialogOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                </div>
                                <div className="p-6 space-y-3">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div className="font-semibold text-gray-700">Ctrl+Z</div>
                                        <div className="text-gray-600">Undo last action</div>

                                        <div className="font-semibold text-gray-700">Ctrl+Y</div>
                                        <div className="text-gray-600">Redo action</div>

                                        <div className="font-semibold text-gray-700">Ctrl+A</div>
                                        <div className="text-gray-600">Select all books</div>

                                        <div className="font-semibold text-gray-700">Ctrl+X</div>
                                        <div className="text-gray-600">Cut selected books</div>

                                        <div className="font-semibold text-gray-700">Ctrl+C</div>
                                        <div className="text-gray-600">Copy selected books</div>

                                        <div className="font-semibold text-gray-700">Ctrl+V</div>
                                        <div className="text-gray-600">Paste books</div>

                                        <div className="font-semibold text-gray-700">↑ / ↓ Arrows</div>
                                        <div className="text-gray-600">Navigate books in list</div>

                                        <div className="font-semibold text-gray-700">Shift+Click</div>
                                        <div className="text-gray-600">Select range of books</div>

                                        <div className="font-semibold text-gray-700">Ctrl+Click</div>
                                        <div className="text-gray-600">Multi-select books</div>

                                        <div className="font-semibold text-gray-700">ESC</div>
                                        <div className="text-gray-600">Close dialogs / Clear selection</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.0.0-alpha.175.2 - How To Use Dialog */}
                    {howToDialogOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setHowToDialogOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">How To Use ReaderWrangler</h2>
                                    <button onClick={() => setHowToDialogOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-gray-700">
                                        <p className="font-semibold mb-2">Getting Started:</p>
                                        <ol className="list-decimal list-inside space-y-1 ml-2">
                                            <li>Use File → Import Library to load your Kindle library from Amazon</li>
                                            <li>Organize books into folders and collections</li>
                                            <li>Use filters to find books by status, tags, type, rating, etc.</li>
                                            <li>Export your organization back to Amazon to sync with devices</li>
                                        </ol>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p>For detailed instructions, see the User Guide documentation.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.1.0-alpha.3 - Auto-Organize Wizard Modal */}
                    {wizardModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setWizardModalOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">🪄 Auto-Organize by Author</h2>
                                    <div className="flex items-center gap-2">
                                        {/* v5.1.0-alpha.10 - Help icon */}
                                        <button
                                            onClick={() => setWizardHelpOpen(true)}
                                            className="text-blue-600 hover:text-blue-800 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors"
                                            title="Show tips">
                                            ?
                                        </button>
                                        <button onClick={() => setWizardModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* v5.1.0-alpha.10 - Source is always Inbox */}
                                    <div className="text-sm text-gray-600 mb-3">
                                        Organizing books from: <strong>Inbox</strong>
                                    </div>

                                    {/* v5.1.0-alpha.10 - Slider with live updates */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-semibold text-gray-700">Minimum Books per Author</label>
                                            <span className="text-sm font-bold text-blue-600">{wizardMinBooksSlider} book{wizardMinBooksSlider === 1 ? '' : 's'}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            value={wizardMinBooksSlider}
                                            onChange={(e) => setWizardMinBooksSlider(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>1</span>
                                            <span>20</span>
                                        </div>
                                    </div>

                                    {/* v5.1.0-alpha.5 - Author list */}
                                    <div className="border border-gray-300 rounded-lg bg-white">
                                        {/* Header with Select All/None + Sort Toggle */}
                                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-300">
                                            <span className="text-sm font-semibold text-gray-700">
                                                Authors found: {wizardAuthors.length}
                                            </span>
                                            <div className="flex gap-2">
                                                {/* v5.1.0-alpha.10 - Sort toggle */}
                                                <button
                                                    onClick={() => setWizardSortBy(wizardSortBy === 'bookCount' ? 'authorName' : 'bookCount')}
                                                    className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                                                    title={wizardSortBy === 'bookCount' ? 'Sort by Author Name' : 'Sort by Book Count'}>
                                                    Sort: {wizardSortBy === 'bookCount' ? '# Books' : 'A-Z'}
                                                </button>
                                                <button
                                                    onClick={() => setWizardSelectedAuthors(new Set(wizardAuthors.map(a => a.normalizedName)))}
                                                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors">
                                                    Select All
                                                </button>
                                                <button
                                                    onClick={() => setWizardSelectedAuthors(new Set())}
                                                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors">
                                                    Select None
                                                </button>
                                            </div>
                                        </div>

                                        {/* Author list scrollable area */}
                                        <div className="max-h-80 overflow-y-auto p-2">
                                            {wizardAuthors.length === 0 ? (
                                                <div className="text-center text-gray-500 py-8">
                                                    <p>No authors found with {wizardMinBooks}+ books</p>
                                                    <p className="text-sm text-gray-400 mt-2">Try lowering the minimum books threshold</p>
                                                </div>
                                            ) : (
                                                wizardAuthors.map(author => (
                                                    <label
                                                        key={author.normalizedName}
                                                        className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={wizardSelectedAuthors.has(author.normalizedName)}
                                                            onChange={(e) => {
                                                                const newSet = new Set(wizardSelectedAuthors);
                                                                if (e.target.checked) {
                                                                    newSet.add(author.normalizedName);
                                                                } else {
                                                                    newSet.delete(author.normalizedName);
                                                                }
                                                                setWizardSelectedAuthors(newSet);
                                                            }}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="ml-3 flex-1 text-sm text-gray-900">{author.displayName}</span>
                                                        <span className="text-sm text-gray-600 mr-4">{author.bookCount} books</span>
                                                        <span className="text-sm text-gray-500">{author.seriesCount} series</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => setWizardModalOpen(false)}
                                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Placeholder for Phase 1.5
                                                console.log('[WIZARD] Organize clicked - Phase 1.5 will implement this');
                                                setWizardModalOpen(false);
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                                            Organize
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.1.0-alpha.10 - Wizard Help Dialog */}
                    {wizardHelpOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setWizardHelpOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">📖 Auto-Organize Tips</h2>
                                    <button onClick={() => setWizardHelpOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-3 text-sm text-gray-700">
                                        <div className="flex gap-2">
                                            <span className="text-blue-600 font-bold">💡</span>
                                            <div>
                                                <strong>Run multiple times with different thresholds:</strong>
                                                <ul className="mt-1 ml-4 list-disc text-gray-600">
                                                    <li>First: 10+ books (top authors)</li>
                                                    <li>Then: 5+ books (prolific)</li>
                                                    <li>Then: 3+ books (regular)</li>
                                                    <li>Finally: 1+ books (everyone)</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-blue-600 font-bold">💡</span>
                                            <div>
                                                <strong>Sort by Author Name</strong> to find co-author duplicates that are adjacent in the list (e.g., "Jim Butcher" followed by "Jim Butcher, Other Author")
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-blue-600 font-bold">💡</span>
                                            <div>
                                                <strong>Co-author books create separate folders</strong> - you can merge them manually if desired after organizing
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-blue-600 font-bold">💡</span>
                                            <div>
                                                <strong>The wizard handles bulk work,</strong> you handle edge cases. Manual adjustments afterwards are expected and normal.
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-blue-600 font-bold">💡</span>
                                            <div>
                                                <strong>Drag the slider</strong> to see how many authors match different thresholds in real-time
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={() => setWizardHelpOpen(false)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                                            Got it
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.1.0 - Removed Migration Dialog (v4 Column App migration no longer needed) */}

                    {insertDividerOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInsertDividerOpen(null)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start p-4 bg-gray-200 rounded-t-lg border-b border-gray-300">
                                    <h2 className="text-xl font-bold text-gray-900">Insert Divider</h2>
                                    <button onClick={() => setInsertDividerOpen(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Divider Label</label>
                                        <input
                                            type="text"
                                            value={newDividerLabel}
                                            onChange={(e) => setNewDividerLabel(e.target.value)}
                                            onKeyPress={(e) => { if (e.key === 'Enter') insertDivider(insertDividerOpen); }}
                                            placeholder="e.g., Jerry Mitchell, Read Books, 5 Stars"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                                        <p>The divider will appear at the bottom of the column. You can drag it to any position.</p>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <button
                                            onClick={() => setInsertDividerOpen(null)}
                                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => insertDivider(insertDividerOpen)}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium"
                                            disabled={!newDividerLabel.trim()}>
                                            Insert
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.0.0-alpha.175.48 - Removed Settings modal (dead code: no button, cacheExpirationDays not used) */}
                    {/* v5.0.0-alpha.175.48 - Removed helpOpen modal (dead code: replaced by howToDialogOpen in Help menu) */}

                    {deleteDialogOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Column</h2>
                                <p className="text-sm text-gray-700 mb-4">
                                    Where should the {columns.find(c => c.id === deleteDialogOpen)?.books.length || 0} books from
                                    "<strong>{columns.find(c => c.id === deleteDialogOpen)?.name}</strong>" be moved?
                                </p>
                                <select
                                    value={deleteDestination}
                                    onChange={(e) => setDeleteDestination(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {columns.filter(c => c.id !== deleteDialogOpen).map(col => (
                                        <option key={col.id} value={col.id}>{col.name}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => { setDeleteDialogOpen(null); setDeleteDestination(''); }}
                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteColumn}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                        Delete Column
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v4.20.0.a - Bulk price goal modal (v5.0.0-alpha.169.8 - use bulkPriceBookIds) */}
                    {showBulkPriceModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                             onClick={() => { setShowBulkPriceModal(false); setBulkPriceInput(''); setBulkPriceBookIds([]); }}>
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Set Custom Price Goal</h2>
                                <p className="text-sm text-gray-600 mb-4">
                                    Set price goal for {bulkPriceBookIds.length} selected book{bulkPriceBookIds.length !== 1 ? 's' : ''}
                                </p>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const price = parseFloat(bulkPriceInput);
                                        if (!isNaN(price) && price > 0) {
                                            const count = bulkPriceBookIds.length;
                                            setBooks(prev => {
                                                const updated = prev.map(b =>
                                                    bulkPriceBookIds.includes(b.id) ? { ...b, priceTrigger: price } : b
                                                );
                                                saveBooksToIndexedDB(updated);
                                                return updated;
                                            });
                                            // Toast feedback
                                            setClipboardMessage(`Price goal set to $${price.toFixed(2)} for ${count} book${count !== 1 ? 's' : ''}`);
                                            setFooterClipboardVisible(false);
                                            setToastVisible(true);
                                            setToastAnimating(false);
                                            setTimeout(() => {
                                                setToastAnimating(true);
                                                setTimeout(() => {
                                                    setToastVisible(false);
                                                    setToastAnimating(false);
                                                    setFooterClipboardVisible(true);
                                                }, 1000);
                                            }, 1500);
                                        }
                                        setShowBulkPriceModal(false);
                                        setBulkPriceInput('');
                                        setBulkPriceBookIds([]);
                                    }}
                                    className="flex flex-col gap-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg text-gray-700">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={bulkPriceInput}
                                            onChange={(e) => setBulkPriceInput(e.target.value)}
                                            className="flex-1 px-3 py-2 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setShowBulkPriceModal(false); setBulkPriceInput(''); }}
                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                                        >
                                            Set Goal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* v4.16.0.aq - Last copy warning dialog */}
                    {/* v4.16.0.ar - Handle already-hidden entries separately */}
                    {lastCopyDialogData && (() => {
                        // Partition entries into already-hidden vs can-hide
                        const alreadyHidden = lastCopyDialogData.lastCopyEntries.filter(sel => {
                            if (sel.instanceId) {
                                return hiddenInstances.has(sel.instanceId);
                            } else {
                                const book = books.find(b => b.id === sel.bookId);
                                return book?.isHidden;
                            }
                        });
                        const canHide = lastCopyDialogData.lastCopyEntries.filter(sel => {
                            if (sel.instanceId) {
                                return !hiddenInstances.has(sel.instanceId);
                            } else {
                                const book = books.find(b => b.id === sel.bookId);
                                return !book?.isHidden;
                            }
                        });
                        const totalLastCopy = lastCopyDialogData.lastCopyEntries.length;

                        return (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Cannot Delete</h2>
                                    <p className="text-sm text-gray-700 mb-4">
                                        {totalLastCopy === 1 ? (
                                            <>
                                                <strong>"{books.find(b => b.id === lastCopyDialogData.lastCopyEntries[0].bookId)?.title || 'This book'}"</strong> is the only copy in your library and cannot be deleted.
                                            </>
                                        ) : (
                                            <>
                                                <strong>{totalLastCopy} books</strong> are the only copies in your library and cannot be deleted.
                                            </>
                                        )}
                                    </p>
                                    {lastCopyDialogData.deletedCount > 0 && (
                                        <p className="text-sm text-gray-500 mb-4">
                                            ({lastCopyDialogData.deletedCount} other book{lastCopyDialogData.deletedCount !== 1 ? 's were' : ' was'} deleted.)
                                        </p>
                                    )}
                                    {/* v4.16.0.ar - Adaptive messaging based on hidden state */}
                                    {/* v4.16.0.as - Improved wording with "These X books" */}
                                    {alreadyHidden.length === totalLastCopy ? (
                                        // All are already hidden
                                        <p className="text-sm text-gray-700 mb-4">
                                            {totalLastCopy === 1 ? 'This book is' : `These ${totalLastCopy} books are`} already hidden.
                                        </p>
                                    ) : alreadyHidden.length > 0 ? (
                                        // Mixed: some hidden, some not
                                        <p className="text-sm text-gray-700 mb-4">
                                            {alreadyHidden.length === 1 ? '1 is' : `These ${alreadyHidden.length} are`} already hidden. Would you like to hide the other {canHide.length}?
                                        </p>
                                    ) : (
                                        // None hidden
                                        <p className="text-sm text-gray-700 mb-4">
                                            Would you like to hide {totalLastCopy === 1 ? 'it' : 'them'} instead?
                                        </p>
                                    )}
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => {
                                                setLastCopyDialogData(null);
                                                clearSelection();
                                            }}
                                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">
                                            {alreadyHidden.length === totalLastCopy ? 'OK' : 'Cancel'}
                                        </button>
                                        {canHide.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    // Hide only the canHide entries
                                                    const guidEntries = canHide.filter(sel => sel.instanceId);
                                                    const legacyEntries = canHide.filter(sel => !sel.instanceId);

                                                    // Handle GUID entries: add to hiddenInstances
                                                    if (guidEntries.length > 0) {
                                                        setHiddenInstances(prev => {
                                                            const next = new Set(prev);
                                                            guidEntries.forEach(sel => next.add(sel.instanceId));
                                                            return next;
                                                        });
                                                    }

                                                    // Handle legacy entries: update book.isHidden
                                                    if (legacyEntries.length > 0) {
                                                        const legacyBookIds = legacyEntries.map(sel => sel.bookId);
                                                        const updatedBooks = books.map(book => {
                                                            if (legacyBookIds.includes(book.id)) {
                                                                return { ...book, isHidden: true };
                                                            }
                                                            return book;
                                                        });
                                                        setBooks(updatedBooks);
                                                        saveBooksToIndexedDB(updatedBooks);
                                                    }

                                                    console.log(`👁️ Hid ${canHide.length} last-copy book(s)`);
                                                    setLastCopyDialogData(null);
                                                    clearSelection();
                                                }}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                                Hide{canHide.length > 1 ? ` ${canHide.length}` : ''}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {collectSeriesOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setCollectSeriesOpen(false)}>
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Group Series Books</h2>

                                {modalBook && (
                                    <p className="text-sm text-gray-700 mb-4">
                                        Collecting books from: <strong style={{ color: '#621e31' }}>{modalBook.series}</strong>
                                    </p>
                                )}

                                {seriesBooks.current.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                            Found in this column ({seriesBooks.current.length}):
                                        </h3>
                                        <ul className="space-y-1 ml-4">
                                            {seriesBooks.current.map(book => (
                                                <li key={book.id} className="text-sm text-gray-700">
                                                    • {book.seriesPosition ? `Book ${book.seriesPosition}: ` : ''}{book.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {seriesBooks.other.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                            Found in other columns ({seriesBooks.other.length}):
                                        </h3>
                                        <ul className="space-y-1 ml-4">
                                            {seriesBooks.other.map(book => (
                                                <li key={book.id} className="text-sm text-gray-700">
                                                    • {book.seriesPosition ? `Book ${book.seriesPosition}: ` : ''}{book.title}
                                                    <span className="text-gray-500 ml-2">({book.columnName})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {seriesBooks.current.length === 0 && seriesBooks.other.length === 0 && (
                                    <p className="text-sm text-gray-600 mb-6 italic">
                                        No other books from this series found in your library.
                                    </p>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCollectSeriesOpen(false);
                                        }}
                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">
                                        Cancel
                                    </button>
                                    {seriesBooks.current.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                collectSeriesBooks(false);
                                            }}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg">
                                            This Column Only
                                        </button>
                                    )}
                                    {seriesBooks.other.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                collectSeriesBooks(true);
                                            }}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg">
                                            All Columns
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {modalBook && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeBookModal}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => navigateBook('prev')}
                                            disabled={!getBookPosition().hasPrev}
                                            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Previous book">
                                            ←
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Book {getBookPosition().current} of {getBookPosition().total}
                                        </span>
                                        <button
                                            onClick={() => navigateBook('next')}
                                            disabled={!getBookPosition().hasNext}
                                            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Next book">
                                            →
                                        </button>
                                    </div>
                                    <button onClick={closeBookModal} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                </div>

                                <div className="p-6">
                                    <div className="flex gap-6 mb-6">
                                        {blankImageBooks.has(modalBook.id) ? (
                                            <div className="w-48 h-72 rounded shadow-lg overflow-hidden flex flex-col flex-shrink-0"
                                                 style={{ backgroundColor: '#d4c5a9' }}>
                                                <div className="flex-1 flex items-center justify-center px-4">
                                                    <div className="text-center">
                                                        <div className="text-sm font-serif font-bold text-gray-800 leading-tight mb-3">
                                                            {modalBook.title}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-3">KINDLE EDITION</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={coverUrlMap[modalBook.coverUrl] || modalBook.coverUrl}
                                                 alt={modalBook.title}
                                                 className="w-48 h-72 object-cover rounded shadow-lg flex-shrink-0"
                                                 onError={(e) => e.target.src = 'https://via.placeholder.com/192x288/4f46e5/fff?text=No+Cover'} />
                                        )}
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-bold text-gray-900 mb-3">{modalBook.title}</h2>
                                            {modalBook.onWishlist && (
                                                <div className="mb-3 flex items-center gap-3">
                                                    <span className="inline-flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                                                        ⭐ Wishlist Item
                                                    </span>
                                                    {/* v4.17.0.k - Green styling when at goal price */}
                                                    {(() => {
                                                        const atGoal = modalBook.priceTrigger != null && modalBook.currentPrice != null && modalBook.currentPrice <= modalBook.priceTrigger;
                                                        return (
                                                            <button
                                                                onClick={() => window.open(getAmazonUrl(modalBook.asin), '_blank')}
                                                                className={`px-3 py-1 ${atGoal ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded text-sm font-medium`}
                                                                title="Opens Amazon with affiliate link">
                                                                View on Amazon {atGoal ? `— $${modalBook.currentPrice.toFixed(2)}` : '→'}
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <p className="text-xl text-gray-700 mb-4">by {modalBook.author}</p>

                                            {modalBook.rating > 0 && (
                                                <div className="flex items-center gap-3 mb-4">
                                                    {renderStars(modalBook.rating)}
                                                    <span className="text-xl font-bold text-gray-700">{modalBook.rating.toFixed(1)}</span>
                                                    {modalBook.ratingCount && (
                                                        <span className="text-sm text-gray-500">({modalBook.ratingCount} ratings)</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* v5.0.0-alpha.175.31 - My Rating (personal rating) */}
                                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                                                <span className="text-sm font-semibold text-gray-700">My Rating:</span>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map(rating => (
                                                        <button
                                                            key={rating}
                                                            onClick={() => {
                                                                setBooks(prev => {
                                                                    const updated = prev.map(b =>
                                                                        b.id === modalBook.id ? { ...b, myRating: rating } : b
                                                                    );
                                                                    saveBooksToIndexedDB(updated);
                                                                    return updated;
                                                                });
                                                                setModalBook(prev => ({ ...prev, myRating: rating }));
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.color = '#3b82f6';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.color = rating <= (modalBook.myRating || 0) ? '#3b82f6' : '#cbd5e1';
                                                            }}
                                                            style={{
                                                                fontSize: '24px',
                                                                cursor: 'pointer',
                                                                color: rating <= (modalBook.myRating || 0) ? '#3b82f6' : '#cbd5e1',
                                                                transition: 'color 0.1s',
                                                                background: 'none',
                                                                border: 'none',
                                                                padding: '0'
                                                            }}
                                                            title={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                                                        >
                                                            {rating <= (modalBook.myRating || 0) ? '★' : '☆'}
                                                        </button>
                                                    ))}
                                                    {modalBook.myRating > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setBooks(prev => {
                                                                    const updated = prev.map(b =>
                                                                        b.id === modalBook.id ? { ...b, myRating: 0 } : b
                                                                    );
                                                                    saveBooksToIndexedDB(updated);
                                                                    return updated;
                                                                });
                                                                setModalBook(prev => ({ ...prev, myRating: 0 }));
                                                            }}
                                                            style={{
                                                                marginLeft: '8px',
                                                                fontSize: '11px',
                                                                color: '#94a3b8',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline'
                                                            }}
                                                            title="Clear rating"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {modalBook.series && (
                                                <div className="mb-3">
                                                    <p className="text-lg mb-2" style={{ color: '#621e31' }}>
                                                        {(modalBook.seriesPosition && modalBook.seriesTotal)
                                                            ? `Book ${modalBook.seriesPosition} of ${modalBook.seriesTotal}: ${modalBook.series}`
                                                            : modalBook.seriesPosition
                                                                ? `Book ${modalBook.seriesPosition}: ${modalBook.series}`
                                                                : modalBook.series
                                                        }
                                                    </p>
                                                    <button
                                                        onClick={openCollectSeriesDialog}
                                                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                        📚 Group Series Books
                                                    </button>
                                                </div>
                                            )}

                                            <div className="space-y-2 text-sm">
                                                {modalBook.binding && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Format:</span>
                                                        <span className="text-gray-600">{modalBook.binding}</span>
                                                    </div>
                                                )}
                                                {modalBook.acquired && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Acquired:</span>
                                                        <span className="text-gray-600">{formatAcquisitionDate(modalBook.acquired)}</span>
                                                    </div>
                                                )}
                                                {modalBook.publicationDate && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Published:</span>
                                                        <span className="text-gray-600">{new Date(modalBook.publicationDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                    </div>
                                                )}
                                                {modalBook.asin && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">ASIN:</span>
                                                        <span className="text-gray-600 font-mono text-xs">{modalBook.asin}</span>
                                                    </div>
                                                )}
                                                {/* Collections metadata (NEW v3.8.0.k) */}
                                                {modalBook.collections && modalBook.collections.length > 0 ? (
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-semibold text-gray-700">Collections:</span>
                                                        <span className="text-gray-600 flex-1">
                                                            {modalBook.collections.map(c => c.name).join(', ')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700">Collections:</span>
                                                        <span className="text-gray-400 italic">No collections</span>
                                                    </div>
                                                )}
                                                {/* Tags (v4.27.0) */}
                                                <div className="flex items-start gap-2">
                                                    <span className="font-semibold text-gray-700">Tags:</span>
                                                    <div className="flex-1 flex flex-wrap items-center gap-1">
                                                        {(() => {
                                                            // v4.27.0 Phase 2 - Show explicit (bold) and inherited (faded) tags
                                                            const explicitTags = modalBook.tags || [];
                                                            const inheritedTags = modalColumnId ? getInheritedTags(modalBook.id, modalColumnId) : [];
                                                            // Filter out inherited tags that are also explicit (to avoid duplicates)
                                                            const uniqueInheritedTags = inheritedTags.filter(t => !explicitTags.includes(t));
                                                            const hasAnyTags = explicitTags.length > 0 || uniqueInheritedTags.length > 0;

                                                            if (!hasAnyTags) {
                                                                return <span className="text-gray-400 italic text-sm">No tags</span>;
                                                            }

                                                            return (
                                                                <>
                                                                    {/* Explicit tags - bold, with remove button */}
                                                                    {explicitTags.map(tagId => (
                                                                        <span key={`explicit-${tagId}`}
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold"
                                                                            title="Explicit tag (assigned to this book)">
                                                                            {tagRegistry[tagId]?.label || tagId}
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newTags = modalBook.tags.filter(t => t !== tagId);
                                                                                    setBooks(prev => {
                                                                                        const updated = prev.map(b =>
                                                                                            b.id === modalBook.id ? { ...b, tags: newTags } : b
                                                                                        );
                                                                                        saveBooksToIndexedDB(updated);
                                                                                        return updated;
                                                                                     });
                                                                                    setModalBook(prev => ({ ...prev, tags: newTags }));
                                                                                }}
                                                                                className="text-blue-600 hover:text-blue-800 font-bold"
                                                                                title="Remove tag">×</button>
                                                                        </span>
                                                                    ))}
                                                                    {/* Inherited tags - faded, no remove button */}
                                                                    {uniqueInheritedTags.map(tagId => (
                                                                        <span key={`inherited-${tagId}`}
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs"
                                                                            title="Inherited from divider (move book to remove)">
                                                                            {tagRegistry[tagId]?.label || tagId}
                                                                        </span>
                                                                    ))}
                                                                </>
                                                            );
                                                        })()}
                                                        <div className="relative inline-block">
                                                            <button
                                                                onClick={() => {
                                                                    if (contextSubmenu !== 'addTagModal') {
                                                                        setTagInputValue('');
                                                                    }
                                                                    setContextSubmenu(contextSubmenu === 'addTagModal' ? null : 'addTagModal');
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-0.5 border border-blue-300 rounded-full hover:bg-blue-50">
                                                                + Add tag
                                                            </button>
                                                            {contextSubmenu === 'addTagModal' && (
                                                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <div className="p-2 flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={tagInputValue}
                                                                            placeholder="Type tag name..."
                                                                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                e.stopPropagation();
                                                                                if (e.key === 'Escape') {
                                                                                    setContextSubmenu(null);
                                                                                    setTagInputValue('');
                                                                                } else if (e.key === 'Enter') {
                                                                                    // v4.27.0-alpha.5 - Enter selects top match or creates new tag
                                                                                    const inputValue = tagInputValue.toLowerCase().trim();
                                                                                    if (!inputValue) return;
                                                                                    const allTagsExactMatch = Object.entries(tagRegistry)
                                                                                        .find(([id, data]) => data.label.toLowerCase() === inputValue);
                                                                                    const existingTags = Object.entries(tagRegistry)
                                                                                        .filter(([id, data]) =>
                                                                                            data.label.toLowerCase().includes(inputValue) &&
                                                                                            !(modalBook.tags || []).includes(id)
                                                                                        )
                                                                                        .sort((a, b) => a[1].label.localeCompare(b[1].label));

                                                                                    if (existingTags.length > 0) {
                                                                                        // Select top match
                                                                                        const [tagId, tagData] = existingTags[0];
                                                                                        const newTags = [...(modalBook.tags || []), tagId];
                                                                                        setBooks(prev => {
                                                                                            const updated = prev.map(b =>
                                                                                                b.id === modalBook.id ? { ...b, tags: newTags } : b
                                                                                            );
                                                                                            saveBooksToIndexedDB(updated);
                                                                                             return updated;
                                                                                        });
                                                                                        setModalBook(prev => ({ ...prev, tags: newTags }));
                                                                                        setTagInputValue('');
                                                                                    } else if (!allTagsExactMatch) {
                                                                                        // Create new tag
                                                                                        const newTagId = inputValue.replace(/\s+/g, '-');
                                                                                        const newTagLabel = tagInputValue.trim();
                                                                                        setTagRegistry(prev => ({
                                                                                            ...prev,
                                                                                            [newTagId]: { label: newTagLabel, count: 1 }
                                                                                        }));
                                                                                        const newTags = [...(modalBook.tags || []), newTagId];
                                                                                        setBooks(prev => {
                                                                                            const updated = prev.map(b =>
                                                                                                b.id === modalBook.id ? { ...b, tags: newTags } : b
                                                                                            );
                                                                                            saveBooksToIndexedDB(updated);
                                                                                            return updated;
                                                                                        });
                                                                                        setModalBook(prev => ({ ...prev, tags: newTags }));
                                                                                        setContextSubmenu(null);
                                                                                        setTagInputValue('');
                                                                                    }
                                                                                    // If tag already on book, do nothing
                                                                                }
                                                                            }}
                                                                            onChange={(e) => setTagInputValue(e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                setContextSubmenu(null);
                                                                                setTagInputValue('');
                                                                            }}
                                                                            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                                                                            title="Close">×</button>
                                                                    </div>
                                                                    <div className="max-h-[200px] overflow-y-auto border-t border-gray-200">
                                                                        {(() => {
                                                                            const inputValue = tagInputValue.toLowerCase().trim();
                                                                            // Check ALL tags for exact match (not just filtered), to prevent duplicates
                                                                            const allTagsExactMatch = Object.entries(tagRegistry)
                                                                                .find(([id, data]) => data.label.toLowerCase() === inputValue);
                                                                            // Filter to tags matching input AND not already on this book
                                                                            const existingTags = Object.entries(tagRegistry)
                                                                                .filter(([id, data]) =>
                                                                                    (!inputValue || data.label.toLowerCase().includes(inputValue)) &&
                                                                                    !(modalBook.tags || []).includes(id)
                                                                                )
                                                                                .sort((a, b) => a[1].label.localeCompare(b[1].label));
                                                                            // Only show Create if no exact match exists in registry at all
                                                                            const showCreate = inputValue && !allTagsExactMatch;
                                                                            // Check if exact match exists but book already has it
                                                                            const tagAlreadyOnBook = allTagsExactMatch && (modalBook.tags || []).includes(allTagsExactMatch[0]);

                                                                            return (
                                                                                <>
                                                                                    {showCreate && (
                                                                                        <button
                                                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                                                                                            onClick={() => {
                                                                                                const newTagId = inputValue.replace(/\s+/g, '-');
                                                                                                const newTagLabel = tagInputValue.trim();
                                                                                                // Add to tag registry
                                                                                                setTagRegistry(prev => ({
                                                                                                    ...prev,
                                                                                                    [newTagId]: { label: newTagLabel, count: 1 }
                                                                                                }));
                                                                                                // Add to book
                                                                                                const newTags = [...(modalBook.tags || []), newTagId];
                                                                                                setBooks(prev => {
                                                                                                    const updated = prev.map(b =>
                                                                                                        b.id === modalBook.id ? { ...b, tags: newTags } : b
                                                                                                    );
                                                                                                    saveBooksToIndexedDB(updated);
                                                                                                    return updated;
                                                                                                });
                                                                                                setModalBook(prev => ({ ...prev, tags: newTags }));
                                                                                                setContextSubmenu(null);
                                                                                                setTagInputValue('');
                                                                                            }}>
                                                                                            <span>➕</span> Create "{tagInputValue.trim()}"
                                                                                        </button>
                                                                                    )}
                                                                                    {existingTags.map(([tagId, tagData]) => (
                                                                                        <button
                                                                                            key={tagId}
                                                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                                                                                            onClick={() => {
                                                                                                // Add existing tag to book
                                                                                                const newTags = [...(modalBook.tags || []), tagId];
                                                                                                setBooks(prev => {
                                                                                                    const updated = prev.map(b =>
                                                                                                        b.id === modalBook.id ? { ...b, tags: newTags } : b
                                                                                                    );
                                                                                                    saveBooksToIndexedDB(updated);
                                                                                                    return updated;
                                                                                                 });
                                                                                                setModalBook(prev => ({ ...prev, tags: newTags }));
                                                                                                // Update tag registry count
                                                                                                setTagInputValue('');
                                                                                            }}>
                                                                                            <span>{tagData.label}</span>
                                                                                            <span className="text-gray-400 text-xs">({getTagCount(tagId)})</span>
                                                                                        </button>
                                                                                    ))}
                                                                                    {existingTags.length === 0 && !showCreate && (
                                                                                        <div className="px-3 py-2 text-sm text-gray-400">
                                                                                            {tagAlreadyOnBook
                                                                                                ? `"${allTagsExactMatch[1].label}" already added`
                                                                                                : inputValue
                                                                                                    ? 'No matching tags'
                                                                                                    : 'Type to search or create'}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price section (v5.0.0-alpha.163 - show for all books, not just wishlist) */}
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-semibold text-gray-700">Current Price:</span>
                                                        {modalBook.currentPrice != null ? (
                                                            <>
                                                                <span className={`text-lg font-bold ${modalBook.priceTrigger && modalBook.currentPrice <= modalBook.priceTrigger ? 'text-green-600' : 'text-gray-900'}`}>
                                                                    ${modalBook.currentPrice.toFixed(2)}
                                                                </span>
                                                                {modalBook.listPrice && modalBook.listPrice > modalBook.currentPrice && (
                                                                    <span className="text-sm text-gray-500">
                                                                        <span className="line-through">${modalBook.listPrice.toFixed(2)}</span>
                                                                        {' '}(Save ${(modalBook.listPrice - modalBook.currentPrice).toFixed(2)})
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Unknown (run library fetch to get prices)</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm text-gray-600">Buy at:</span>
                                                        {[0.99, 1.99, 2.99, 3.99, 4.99].map(price => (
                                                            <button
                                                                key={price}
                                                                onClick={() => {
                                                                    setBooks(prev => {
                                                                        const updated = prev.map(b =>
                                                                            b.id === modalBook.id ? { ...b, priceTrigger: price } : b
                                                                        );
                                                                        saveBooksToIndexedDB(updated);
                                                                        return updated;
                                                                    });
                                                                    setModalBook(prev => ({ ...prev, priceTrigger: price }));
                                                                }}
                                                                className={`px-2 py-1 text-sm rounded ${modalBook.priceTrigger === price ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                                            >
                                                                ${price.toFixed(2)}
                                                            </button>
                                                        ))}
                                                        {!showCustomPriceInput ? (
                                                            <button
                                                                onClick={() => setShowCustomPriceInput(true)}
                                                                className={`px-2 py-1 text-sm rounded ${modalBook.priceTrigger && ![0.99, 1.99, 2.99, 3.99, 4.99].includes(modalBook.priceTrigger) ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                                            >
                                                                Custom...
                                                            </button>
                                                        ) : (
                                                            <form
                                                                onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    const price = parseFloat(customPriceInput);
                                                                    if (!isNaN(price) && price > 0) {
                                                                        setBooks(prev => {
                                                                            const updated = prev.map(b =>
                                                                                b.id === modalBook.id ? { ...b, priceTrigger: price } : b
                                                                            );
                                                                            saveBooksToIndexedDB(updated);
                                                                            return updated;
                                                                        });
                                                                        setModalBook(prev => ({ ...prev, priceTrigger: price }));
                                                                    }
                                                                    setShowCustomPriceInput(false);
                                                                    setCustomPriceInput('');
                                                                }}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <span className="text-sm text-gray-600">$</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0.01"
                                                                    value={customPriceInput}
                                                                    onChange={(e) => setCustomPriceInput(e.target.value)}
                                                                    className="w-16 px-1 py-1 text-sm border rounded"
                                                                    placeholder="0.00"
                                                                    autoFocus
                                                                />
                                                                <button type="submit" className="px-2 py-1 text-sm bg-blue-600 text-white rounded">Set</button>
                                                                <button type="button" onClick={() => { setShowCustomPriceInput(false); setCustomPriceInput(''); }} className="px-1 py-1 text-sm text-gray-500">×</button>
                                                            </form>
                                                        )}
                                                        {/* v4.20.0.a - More visible Clear button for consistency with bulk menu */}
                                                        {modalBook.priceTrigger && (
                                                            <button
                                                                onClick={() => {
                                                                    setBooks(prev => {
                                                                        const updated = prev.map(b =>
                                                                            b.id === modalBook.id ? { ...b, priceTrigger: null } : b
                                                                        );
                                                                        saveBooksToIndexedDB(updated);
                                                                        return updated;
                                                                    });
                                                                    setModalBook(prev => ({ ...prev, priceTrigger: null }));
                                                                }}
                                                                className="px-2 py-1 text-sm rounded bg-red-100 hover:bg-red-200 text-red-700"
                                                                title="Clear price goal"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>

                                                    {modalBook.priceTrigger && (
                                                        <p className="mt-2 text-sm text-green-600">
                                                            ✓ Goal: {'$'}{modalBook.priceTrigger.toFixed(2)} or less
                                                        </p>
                                                    )}
                                            </div>

                                        </div>
                                    </div>

                                    {/* v4.21.0.a - Book Notes section */}
                                    <div className="mb-6 pb-6 border-b border-gray-200">
                                        {isEditingNote ? (
                                            // Edit mode - show textarea
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Note</h3>
                                                <textarea
                                                    className="book-note-editor"
                                                    value={noteEditContent}
                                                    onChange={(e) => setNoteEditContent(e.target.value)}
                                                    placeholder="Add a personal note about this book..."
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        // Stop all key events from propagating to prevent
                                                        // DEL from deleting books, etc.
                                                        e.stopPropagation();
                                                        if (e.key === 'Escape') {
                                                            setIsEditingNote(false);
                                                            setNoteEditContent('');
                                                        }
                                                    }}
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={() => {
                                                            const trimmedNote = noteEditContent.trim();
                                                            const newNote = trimmedNote || undefined;
                                                            // Save note (or clear if empty) - no undo support for notes
                                                            setBooks(prev => {
                                                                const updated = prev.map(b =>
                                                                    b.id === modalBook.id
                                                                        ? { ...b, userNote: newNote }
                                                                        : b
                                                                );
                                                                saveBooksToIndexedDB(updated);
                                                                return updated;
                                                            });
                                                            setModalBook(prev => ({
                                                                ...prev,
                                                                userNote: newNote
                                                            }));
                                                            setIsEditingNote(false);
                                                            setNoteEditContent('');
                                                        }}
                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsEditingNote(false);
                                                            setNoteEditContent('');
                                                        }}
                                                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : modalBook.userNote ? (
                                            // Display mode - show sticky note
                                            <div className="book-note">
                                                <div className="book-note-text">{modalBook.userNote}</div>
                                                <button
                                                    className="book-note-edit-btn"
                                                    onClick={() => {
                                                        setNoteEditContent(modalBook.userNote);
                                                        setIsEditingNote(true);
                                                    }}
                                                    title="Edit note"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        ) : (
                                            // No note - show Add Note button
                                            <button
                                                onClick={() => {
                                                    setNoteEditContent('');
                                                    setIsEditingNote(true);
                                                }}
                                                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400"
                                            >
                                                + Add Note
                                            </button>
                                        )}
                                    </div>

                                    {!modalBook.description && (
                                        <div className="mb-6 pb-6 border-b border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <p className="text-sm text-gray-700">
                                                    ⚠️ <strong>Description not available</strong>
                                                </p>
                                                <p className="text-xs text-gray-600 mt-2">
                                                    This book may not have a description in Amazon's database, or the description wasn't captured during the library fetch.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {modalBook.description && (
                                        <div className="mb-6 pb-6 border-b border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {modalBook.description}
                                            </p>
                                        </div>
                                    )}

                                    {modalBook.topReviews && modalBook.topReviews.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Reviews</h3>
                                            <div className="space-y-4">
                                                {modalBook.topReviews.slice(0, showAllReviews ? modalBook.topReviews.length : 3).map((review, idx) => {
                                                    const stars = review.stars || 0;
                                                    const title = review.title || '';
                                                    const text = review.text || review.contentAbstract?.textAbstract || '';
                                                    const reviewer = review.reviewer || review.contributor?.publicProfile?.publicProfile?.publicName?.displayString || '';

                                                    return (
                                                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-yellow-500 text-lg">{'★'.repeat(stars)}</span>
                                                                {title && (
                                                                    <span className="font-semibold text-gray-900">{title}</span>
                                                                )}
                                                            </div>
                                                            {reviewer && (
                                                                <p className="text-sm text-gray-600 mb-2">
                                                                    by {reviewer}
                                                                </p>
                                                            )}
                                                            {text && (
                                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                                    {text}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {!showAllReviews && modalBook.topReviews.length > 3 && (
                                                <button
                                                    onClick={() => setShowAllReviews(true)}
                                                    className="mt-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm">
                                                    Show More Reviews ({modalBook.topReviews.length - 3} more)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v5.0.0 - Book Explorer view (always rendered) */}
                    <div className="flex-1 min-h-0 flex mb-6">
                        {/* Left pane: Folder tree */}
                            {/* v5.0.0-alpha.49 - onDragOver prevents browser "split view" prompt */}
                            {/* v5.0.0-alpha.91 - Resizable left pane */}
                            {/* v5.0.0-alpha.95 - Sticky header and virtual folders */}
                            <div className="bg-white border-r border-gray-200 flex flex-col flex-shrink-0"
                                style={{ width: `${leftPaneWidth}px` }}
                                onDragOver={(e) => e.preventDefault()}>
                                {/* Sticky section: Header + virtual folders */}
                                {/* v5.0.0-alpha.97 - Border-bottom separates sticky from scrollable */}
                                <div className="sticky top-0 bg-white z-10 border-b border-gray-300">
                                <div className="p-3 border-b border-gray-200 font-medium text-gray-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>Folders</span>
                                        {/* v5.0.0-alpha.125 - Navigation buttons with proper chevron icons */}
                                        <div className="flex gap-1 border-x border-gray-300 px-2">
                                            <button
                                                onClick={goBack}
                                                disabled={!canGoBack}
                                                className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${
                                                    canGoBack
                                                        ? 'text-gray-700 hover:bg-blue-50 hover:border-blue-300 border-gray-300'
                                                        : 'text-gray-300 cursor-not-allowed border-gray-200'
                                                }`}
                                                title="Back (Alt+Left)">
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={canGoBack ? '' : 'opacity-40'}>
                                                    <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                            <button
                                                onClick={goForward}
                                                disabled={!canGoForward}
                                                className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${
                                                    canGoForward
                                                        ? 'text-gray-700 hover:bg-blue-50 hover:border-blue-300 border-gray-300'
                                                        : 'text-gray-300 cursor-not-allowed border-gray-200'
                                                }`}
                                                title="Forward (Alt+Right)">
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={canGoForward ? '' : 'opacity-40'}>
                                                    <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Expand/Collapse All toggle */}
                                    <button
                                        onClick={() => {
                                            // Check if any folder is expanded
                                            const anyExpanded = folders.some(f => !f.collapsed && getChildFolders(f.id).length > 0);
                                            // Toggle all: if any expanded, collapse all; else expand all
                                            setFolders(prev => prev.map(f => ({ ...f, collapsed: anyExpanded })));
                                        }}
                                        className="text-gray-400 hover:text-gray-600 text-sm px-1"
                                        title={folders.some(f => !f.collapsed && getChildFolders(f.id).length > 0) ? 'Collapse all folders' : 'Expand all folders'}>
                                        {folders.some(f => !f.collapsed && getChildFolders(f.id).length > 0) ? '▼' : '▶'}
                                    </button>
                                </div>
                                {/* v5.0.0-alpha.169 - Filtered folder indicator */}
                                {hasActiveFilters && (
                                    <div className="px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                        <span>
                                            {(() => {
                                                // v5.0.0-alpha.169.2 - Exclude Inbox from count (it's rendered separately)
                                                const userFolders = folders.filter(f => f.id !== '__inbox__');
                                                const visibleCount = userFolders.filter(f => {
                                                    const { matching } = getFilteredFolderCount(f.id);
                                                    // Folder is visible if it has matches OR has descendant with matches
                                                    const hasMatchingDescendant = (folderId) => {
                                                        const childFolders = folders.filter(c => c.parentId === folderId);
                                                        return childFolders.some(child => {
                                                            const { matching: childMatching } = getFilteredFolderCount(child.id);
                                                            return childMatching > 0 || hasMatchingDescendant(child.id);
                                                        });
                                                    };
                                                    return matching > 0 || hasMatchingDescendant(f.id);
                                                }).length;
                                                const totalCount = userFolders.length;
                                                // v5.0.0-alpha.169.3 - Changed wording to remove "Showing" implication
                                                return visibleCount === 0
                                                    ? 'No folders match'
                                                    : `${visibleCount} of ${totalCount} folders match`;
                                            })()}
                                        </span>
                                        <button
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                            onClick={() => setShowAllFoldersOverride(prev => !prev)}>
                                            {showAllFoldersOverride ? 'Hide empty' : 'Show all'}
                                        </button>
                                    </div>
                                )}
                                <div className="p-2">
                                    {/* All Books (virtual, view-only) - v5.0.0-alpha.52 added "+" for new root folder */}
                                    <div
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group ${selectedFolderId === '__all__' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
                                        onClick={() => navigateToFolder('__all__')}>
                                        <span className="pointer-events-none">{FOLDER_ALL_BOOKS.icon}</span>
                                        <span className="flex-1 pointer-events-none">{FOLDER_ALL_BOOKS.name}</span>
                                        <span className="text-xs text-gray-500 pointer-events-none">({books.length})</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newFolder = {
                                                    id: `folder-${Date.now()}`,
                                                    name: 'New Folder',
                                                    parentId: null,
                                                    bookIds: [],
                                                    childFolderIds: [],
                                                    collapsed: false
                                                };
                                                recordAction({
                                                    type: 'CREATE_FOLDER',
                                                    folderId: newFolder.id,
                                                    parentId: null,
                                                    folder: { ...newFolder }
                                                });
                                                setFolders(prev => [...prev, newFolder]);
                                                navigateToFolder(newFolder.id);
                                                setEditingFolderId(newFolder.id);
                                                setEditingFolderName('New Folder');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 px-1"
                                            title="New folder">
                                            +
                                        </button>
                                    </div>
                                    {/* Divider line to separate All Books from folders */}
                                    <div className="border-b border-gray-200 my-1 mx-2"></div>
                                    {/* v5.0.0-alpha.63 - My Library (organizational root container) */}
                                    <div
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${selectedFolderId === '__library__' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
                                        onClick={() => navigateToFolder('__library__')}>
                                        <span className="pointer-events-none">{FOLDER_LIBRARY.icon}</span>
                                        <span className="flex-1 pointer-events-none">{FOLDER_LIBRARY.name}</span>
                                        <span className="text-xs text-gray-500 pointer-events-none">
                                            ({getChildFolders(null).length} folders)
                                        </span>
                                    </div>
                                    {/* Inbox - indented as part of folder hierarchy */}
                                    <div
                                        className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded cursor-pointer ${selectedFolderId === '__inbox__' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'} ${explorerDropTargetId === '__inbox__' ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                                        onClick={() => navigateToFolder('__inbox__')}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setExplorerDropTargetId('__inbox__');
                                        }}
                                        onDragLeave={(e) => {
                                            // Only clear if actually leaving container, not moving to child element
                                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                                setExplorerDropTargetId(null);
                                            }
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const dragData = JSON.parse(e.dataTransfer.getData('application/x-readerwrangler'));
                                            const { sourceFolder, bookIds } = dragData;

                                            // Check if dragging from All Books (view-only)
                                            if (sourceFolder === '__all__') {
                                                setClipboardMessage('All Books is view-only. Organize from folders.');
                                                setToastPosition({ x: e.clientX, y: e.clientY });
                                                setFooterClipboardVisible(false);
                                                setToastVisible(true);
                                                setToastAnimating(false);
                                                setTimeout(() => {
                                                    setToastAnimating(true);
                                                    setTimeout(() => {
                                                        setToastVisible(false);
                                                        setToastAnimating(false);
                                                    }, 1000);
                                                }, 1500);
                                                setExplorerDropTargetId(null);
                                                setExplorerSelectedBooks(new Set());
                                                return;
                                            }

                                            // Remove these books from all user folders
                                            setFolders(prev => prev.map(folder => ({
                                                ...folder,
                                                bookIds: (folder.bookIds || []).filter(id => !bookIds.includes(id))
                                            })));
                                            setExplorerDropTargetId(null);
                                            setExplorerSelectedBooks(new Set());
                                        }}>
                                        <span className="pointer-events-none">{FOLDER_INBOX.icon}</span>
                                        <span className="flex-1 pointer-events-none">{FOLDER_INBOX.name}</span>
                                        {/* v5.0.0-alpha.169.2 - Show filtered count (X/Y) when filter active */}
                                        {hasActiveFilters ? (() => {
                                            const { matching, total } = getFilteredFolderCount('__inbox__');
                                            const colorClass = matching === 0 ? 'text-gray-400' : 'text-green-600';
                                            return <span className={`text-xs pointer-events-none ${colorClass}`}>({matching}/{total})</span>;
                                        })() : (
                                            <span className="text-xs text-gray-500 pointer-events-none">({getFolderBookIds('__inbox__').length})</span>
                                        )}
                                    </div>
                                </div>
                                </div>
                                {/* Scrollable section: User folders */}
                                <div className="flex-1 overflow-y-auto p-2">
                                    {/* User folders with recursive subfolder rendering */}
                                    {(() => {
                                        // Recursive folder renderer
                                        const renderFolder = (folder, depth = 0) => {
                                            // v5.0.0-alpha.169 - Hide folders with no matches when filter active
                                            if (hasActiveFilters && !showAllFoldersOverride) {
                                                const { matching } = getFilteredFolderCount(folder.id);
                                                // Also check if any descendant has matches (show parent if child matches)
                                                const hasMatchingDescendant = (folderId) => {
                                                    const childFolders = folders.filter(f => f.parentId === folderId);
                                                    return childFolders.some(child => {
                                                        const { matching: childMatching } = getFilteredFolderCount(child.id);
                                                        return childMatching > 0 || hasMatchingDescendant(child.id);
                                                    });
                                                };
                                                if (matching === 0 && !hasMatchingDescendant(folder.id)) {
                                                    return null; // Hide folder with no matches
                                                }
                                            }

                                            const children = getChildFolders(folder.id);
                                            const hasChildren = children.length > 0;
                                            const isExpanded = !folder.collapsed;

                                            return (
                                                <React.Fragment key={folder.id}>
                                                    <div
                                                        className={`w-full flex items-center gap-1 pr-2 py-1.5 rounded cursor-pointer group ${selectedFolderId === folder.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'} ${explorerDropTargetId === folder.id || (sidebarFolderDragTarget?.type === 'reparent' && sidebarFolderDragTarget?.folderId === folder.id) ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                                                        style={{
                                                            paddingLeft: `${16 + depth * 16}px`,
                                                            // v5.0.0-alpha.86 - Visual feedback for folder reorder
                                                            ...(sidebarFolderDragTarget?.type === 'reorder' && sidebarFolderDragTarget?.folderId === folder.id
                                                                ? sidebarFolderDragTarget.position === 'before'
                                                                    ? { borderTop: '3px solid #3b82f6' }
                                                                    : { borderBottom: '3px solid #3b82f6' }
                                                                : {}),
                                                            // v5.0.0-alpha.141 - Dim cut folders
                                                            ...(folderClipboard.operation === 'cut' && folderClipboard.items.includes(folder.id)
                                                                ? { opacity: 0.5 }
                                                                : {})
                                                        }}
                                                        draggable={true}
                                                        onDragStart={(e) => {
                                                            // v5.0.0-alpha.86 - Enable folder dragging in sidebar
                                                            e.dataTransfer.effectAllowed = 'move';
                                                            e.dataTransfer.setData('application/x-folder-reorder', JSON.stringify({
                                                                folderIds: [folder.id],
                                                                sourceFolderId: selectedFolderId
                                                            }));
                                                        }}
                                                        onDragEnd={() => {
                                                            setSidebarFolderDragTarget(null);
                                                            setBreadcrumbDropTargetId(null);
                                                        }}
                                                        onClick={() => navigateToFolder(folder.id)}
                                                        onDoubleClick={() => {
                                                            setEditingFolderId(folder.id);
                                                            setEditingFolderName(folder.name);
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            const types = Array.from(e.dataTransfer.types);
                                                            const isFolderDrag = types.includes('application/x-folder-reorder');
                                                            const isBookDrag = types.includes('application/x-readerwrangler');

                                                            if (isBookDrag) {
                                                                // Book drag - existing behavior
                                                                const isCopy = e.ctrlKey;
                                                                setExplorerIsCopyDrag(isCopy);
                                                                e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
                                                                setExplorerDropTargetId(folder.id);
                                                            } else if (isFolderDrag) {
                                                                // v5.0.0-alpha.86 - Folder drag with zone detection
                                                                e.dataTransfer.dropEffect = 'move';
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const y = e.clientY - rect.top;
                                                                const height = rect.height;
                                                                const edgeZone = height * 0.25;

                                                                let newTarget;
                                                                if (y < edgeZone) {
                                                                    newTarget = { type: 'reorder', folderId: folder.id, position: 'before' };
                                                                } else if (y > height - edgeZone) {
                                                                    newTarget = { type: 'reorder', folderId: folder.id, position: 'after' };
                                                                } else {
                                                                    newTarget = { type: 'reparent', folderId: folder.id };
                                                                }
                                                                // Only update if changed
                                                                const current = sidebarFolderDragTarget;
                                                                if (!current || current.type !== newTarget.type ||
                                                                    current.folderId !== newTarget.folderId ||
                                                                    current.position !== newTarget.position) {
                                                                    setSidebarFolderDragTarget(newTarget);
                                                                }
                                                            }

                                                            // v5.0.0-alpha.82 - Auto-expand collapsed folder after 500ms hover
                                                            if (hasChildren && folder.collapsed) {
                                                                if (!dragHoverExpandTimeoutRef.current) {
                                                                    dragHoverExpandTimeoutRef.current = setTimeout(() => {
                                                                        setFolders(prev => prev.map(f =>
                                                                            f.id === folder.id ? { ...f, collapsed: false } : f
                                                                        ));
                                                                        dragHoverExpandTimeoutRef.current = null;
                                                                    }, 500);
                                                                }
                                                            }
                                                        }}
                                                        onDragLeave={(e) => {
                                                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                                                setExplorerDropTargetId(null);
                                                                setSidebarFolderDragTarget(null);
                                                                // v5.0.0-alpha.82 - Clear auto-expand timeout
                                                                if (dragHoverExpandTimeoutRef.current) {
                                                                    clearTimeout(dragHoverExpandTimeoutRef.current);
                                                                    dragHoverExpandTimeoutRef.current = null;
                                                                }
                                                            }
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            // v5.0.0-alpha.82 - Clear auto-expand timeout on drop
                                                            if (dragHoverExpandTimeoutRef.current) {
                                                                clearTimeout(dragHoverExpandTimeoutRef.current);
                                                                dragHoverExpandTimeoutRef.current = null;
                                                            }

                                                            // v5.0.0-alpha.86 - Handle folder drops first
                                                            const folderData = e.dataTransfer.getData('application/x-folder-reorder');
                                                            if (folderData) {
                                                                try {
                                                                    const { folderIds } = JSON.parse(folderData);
                                                                    const target = sidebarFolderDragTarget;
                                                                    setSidebarFolderDragTarget(null);

                                                                    if (target?.type === 'reparent') {
                                                                        reparentFolder(folderIds, folder.id);
                                                                    } else if (target?.type === 'reorder') {
                                                                        // Reorder among siblings
                                                                        const draggedFolder = folders.find(f => f.id === folderIds[0]);
                                                                        if (!draggedFolder) return;

                                                                        // Only reorder if same parent level
                                                                        if (draggedFolder.parentId !== folder.parentId) {
                                                                            // Different parent - reparent to this folder's parent first
                                                                            reparentFolder(folderIds, folder.parentId);
                                                                        }

                                                                        // Get siblings at this level
                                                                        const siblings = getChildFolders(folder.parentId);
                                                                        const fromIndex = siblings.findIndex(f => f.id === folderIds[0]);
                                                                        let toIndex = siblings.findIndex(f => f.id === folder.id);
                                                                        if (target.position === 'after') toIndex++;
                                                                        if (fromIndex < toIndex) toIndex--;

                                                                        if (fromIndex !== -1 && fromIndex !== toIndex) {
                                                                            // Build new order
                                                                            const newOrder = siblings.filter(f => f.id !== folderIds[0]);
                                                                            newOrder.splice(toIndex, 0, draggedFolder);

                                                                            // Update sortIndex or childFolderIds
                                                                            if (folder.parentId === null) {
                                                                                // Root level - update sortIndex
                                                                                setFolders(prev => prev.map(f => {
                                                                                    const idx = newOrder.findIndex(s => s.id === f.id);
                                                                                    if (idx !== -1) {
                                                                                        return { ...f, sortIndex: idx };
                                                                                    }
                                                                                    return f;
                                                                                }));
                                                                            } else {
                                                                                // Nested - update parent's childFolderIds
                                                                                const newChildIds = newOrder.map(f => f.id);
                                                                                setFolders(prev => prev.map(f =>
                                                                                    f.id === folder.parentId
                                                                                        ? { ...f, childFolderIds: newChildIds }
                                                                                        : f
                                                                                ));
                                                                            }

                                                                            recordAction({
                                                                                type: 'REORDER_FOLDER',
                                                                                folderId: folderIds[0],
                                                                                fromIndex,
                                                                                toIndex,
                                                                                parentId: folder.parentId
                                                                            });
                                                                            console.log(`📁 Reordered folder in sidebar`);
                                                                        }
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Sidebar folder drop error:', err);
                                                                }
                                                                return;
                                                            }

                                                            // Book drop - existing behavior
                                                            const bookDataStr = e.dataTransfer.getData('application/x-readerwrangler');
                                                            if (!bookDataStr) return;
                                                            const dragData = JSON.parse(bookDataStr);
                                                            const { sourceFolder, bookIds } = dragData;

                                                            const showToastLocal = (msg) => {
                                                                setClipboardMessage(msg);
                                                                setToastPosition({ x: e.clientX, y: e.clientY });
                                                                setFooterClipboardVisible(false);
                                                                setToastVisible(true);
                                                                setToastAnimating(false);
                                                                setTimeout(() => {
                                                                    setToastAnimating(true);
                                                                    setTimeout(() => {
                                                                        setToastVisible(false);
                                                                        setToastAnimating(false);
                                                                    }, 1000);
                                                                }, 1500);
                                                            };

                                                            if (sourceFolder === '__all__') {
                                                                showToastLocal('All Books is view-only. Organize from folders.');
                                                                setExplorerDropTargetId(null);
                                                                setExplorerSelectedBooks(new Set());
                                                                return;
                                                            }

                                                            const existing = new Set(folder.bookIds || []);
                                                            const newBookIds = bookIds.filter(id => !existing.has(id));
                                                            if (newBookIds.length === 0) {
                                                                showToastLocal(bookIds.length === 1 ? 'Book already in folder' : 'Books already in folder');
                                                            } else {
                                                                // v5.0.0-alpha.46 - Capture fromIndices for undo before modifying
                                                                const sourceFolderObj = folders.find(f => f.id === sourceFolder);
                                                                const fromIndices = bookIds.map(id => (sourceFolderObj?.bookIds || []).indexOf(id));

                                                                setFolders(prev => prev.map(f => {
                                                                    if (f.id === folder.id) {
                                                                        return { ...f, bookIds: [...newBookIds, ...(f.bookIds || [])] };
                                                                    }
                                                                    if (!explorerIsCopyDrag && f.id === sourceFolder) {
                                                                        return { ...f, bookIds: (f.bookIds || []).filter(id => !bookIds.includes(id)) };
                                                                    }
                                                                    return f;
                                                                }));

                                                                // v5.0.0-alpha.46 - Record action for undo
                                                                if (explorerIsCopyDrag) {
                                                                    recordAction({
                                                                        type: 'COPY_BOOKS_FOLDER',
                                                                        toFolderId: folder.id,
                                                                        bookIds: newBookIds,
                                                                        toIndex: 0 // Prepended to start
                                                                    });
                                                                    console.log(`📋 Copied ${newBookIds.length} book(s) to "${folder.name}"`);
                                                                } else {
                                                                    recordAction({
                                                                        type: 'MOVE_BOOKS_FOLDER',
                                                                        fromFolderId: sourceFolder,
                                                                        toFolderId: folder.id,
                                                                        bookIds: bookIds,
                                                                        fromIndices: fromIndices,
                                                                        toIndex: 0 // Prepended to start
                                                                    });
                                                                    console.log(`📦 Moved ${bookIds.length} book(s) to "${folder.name}"`);
                                                                }
                                                            }
                                                            setExplorerDropTargetId(null);
                                                            setExplorerSelectedBooks(new Set());
                                                            setExplorerIsCopyDrag(false);
                                                        }}
                                                        onContextMenu={(e) => {
                                                            // v5.0.0-alpha.133 - Show visual context menu (replaces prompt)
                                                            e.preventDefault();
                                                            setFolderContextMenu({
                                                                folderId: folder.id,
                                                                x: e.clientX,
                                                                y: e.clientY,
                                                                source: 'left' // v5.0.0-alpha.156 - Track which panel triggered menu
                                                            });
                                                        }}>
                                                        {/* Expand/collapse chevron for folders with children */}
                                                        {hasChildren ? (
                                                            <span
                                                                className="text-gray-400 hover:text-gray-600 cursor-pointer w-4 text-center"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFolders(prev => prev.map(f =>
                                                                        f.id === folder.id ? { ...f, collapsed: !f.collapsed } : f
                                                                    ));
                                                                }}>
                                                                {isExpanded ? '▼' : '▶'}
                                                            </span>
                                                        ) : (
                                                            <span className="w-4"></span>
                                                        )}
                                                        <span className="pointer-events-none">📁</span>
                                                        {editingFolderId === folder.id ? (
                                                            <input
                                                                type="text"
                                                                value={editingFolderName}
                                                                onChange={(e) => setEditingFolderName(e.target.value)}
                                                                onBlur={() => {
                                                                    // v5.0.0-alpha.134 - Keep placeholder text if user didn't type
                                                                    const finalName = (isPlaceholderMode || !editingFolderName.trim())
                                                                        ? editingFolderName
                                                                        : editingFolderName.trim();
                                                                    if (finalName) {
                                                                        setFolders(prev => prev.map(f =>
                                                                            f.id === folder.id ? { ...f, name: finalName } : f
                                                                        ));
                                                                    }
                                                                    setEditingFolderId(null);
                                                                    setEditingFolderName('');
                                                                    setIsPlaceholderMode(false);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    // v5.0.0-alpha.134 - Clear placeholder on first character typed
                                                                    if (isPlaceholderMode && e.key.length === 1) {
                                                                        // Printable character typed - clear placeholder first
                                                                        setEditingFolderName('');
                                                                        setIsPlaceholderMode(false);
                                                                        // Let the character be inserted by default behavior
                                                                        return;
                                                                    }

                                                                    if (e.key === 'Enter') {
                                                                        // v5.0.0-alpha.134 - Keep placeholder text if user didn't type
                                                                        const finalName = (isPlaceholderMode || !editingFolderName.trim())
                                                                            ? editingFolderName
                                                                            : editingFolderName.trim();
                                                                        if (finalName) {
                                                                            setFolders(prev => prev.map(f =>
                                                                                f.id === folder.id ? { ...f, name: finalName } : f
                                                                            ));
                                                                        }
                                                                        setEditingFolderId(null);
                                                                        setEditingFolderName('');
                                                                        setIsPlaceholderMode(false);
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingFolderId(null);
                                                                        setEditingFolderName('');
                                                                        setIsPlaceholderMode(false);
                                                                    }
                                                                }}
                                                                onFocus={(e) => {
                                                                    // v5.0.0-alpha.134 - Position cursor at start in placeholder mode
                                                                    if (isPlaceholderMode) {
                                                                        e.target.setSelectionRange(0, 0);
                                                                    }
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                autoFocus
                                                                className={`flex-1 px-1 py-0.5 text-sm border border-blue-400 rounded outline-none ${isPlaceholderMode ? 'text-gray-400' : ''}`}
                                                            />
                                                        ) : (
                                                            <>
                                                                <span className="flex-1 pointer-events-none">{folder.name}</span>
                                                                {(() => {
                                                                    // v5.0.0-alpha.169.3 - Show filtered count with "inside" badge
                                                                    if (hasActiveFilters) {
                                                                        const { matching, total, directMatching } = getFilteredFolderCount(folder.id);
                                                                        // No matches anywhere - gray
                                                                        if (matching === 0) {
                                                                            return (
                                                                                <span
                                                                                    className="text-xs pointer-events-none text-gray-400"
                                                                                    title={`${matching} matching • ${total} total`}>
                                                                                    ({matching}/{total})
                                                                                </span>
                                                                            );
                                                                        }
                                                                        // Collapsed with no direct matches but children have matches - blue "inside"
                                                                        if (folder.collapsed && directMatching === 0 && matching > 0) {
                                                                            return (
                                                                                <span
                                                                                    className="text-xs pointer-events-none text-blue-600"
                                                                                    title={`${matching} matching books in subfolders • expand to see`}>
                                                                                    ({matching} books inside)
                                                                                </span>
                                                                            );
                                                                        }
                                                                        // Has direct matches or is expanded - green
                                                                        return (
                                                                            <span
                                                                                className="text-xs pointer-events-none text-green-600"
                                                                                title={`${matching} matching • ${total} total`}>
                                                                                ({matching}/{total})
                                                                            </span>
                                                                        );
                                                                    }
                                                                    // Normal count display
                                                                    const counts = getFolderTotalCount(folder.id);
                                                                    const tooltip = counts.subfolder > 0
                                                                        ? `${counts.direct} direct • ${counts.subfolder} in subfolders`
                                                                        : `${counts.direct} books`;
                                                                    return (
                                                                        <span
                                                                            className="text-xs text-gray-500 pointer-events-none"
                                                                            title={tooltip}>
                                                                            ({counts.total})
                                                                        </span>
                                                                    );
                                                                })()}
                                                                {/* v5.0.0-alpha.52 - New subfolder button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newFolder = {
                                                                            id: `folder-${Date.now()}`,
                                                                            name: 'New Subfolder',
                                                                            parentId: folder.id,
                                                                            bookIds: [],
                                                                            childFolderIds: [],
                                                                            collapsed: false
                                                                        };
                                                                        recordAction({
                                                                            type: 'CREATE_FOLDER',
                                                                            folderId: newFolder.id,
                                                                            parentId: folder.id,
                                                                            folder: { ...newFolder }
                                                                        });
                                                                        // Expand parent and add subfolder in single update
                                                                        setFolders(prev => [
                                                                            ...prev.map(f => f.id === folder.id ? { ...f, collapsed: false } : f),
                                                                            newFolder
                                                                        ]);
                                                                        navigateToFolder(newFolder.id);
                                                                        setEditingFolderId(newFolder.id);
                                                                        setEditingFolderName('New Subfolder');
                                                                        setIsPlaceholderMode(true); // v5.0.0-alpha.134 - Show as placeholder
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 px-1"
                                                                    title="New subfolder">
                                                                    +
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(`Delete folder "${folder.name}"?`)) {
                                                                            // v5.0.0-alpha.55 - Move orphaned books up one level before deleting
                                                                            const getAllDescendants = (folderId, allFolders) => {
                                                                                const children = allFolders.filter(f => f.parentId === folderId);
                                                                                let descendants = [...children];
                                                                                children.forEach(child => {
                                                                                    descendants = [...descendants, ...getAllDescendants(child.id, allFolders)];
                                                                                });
                                                                                return descendants;
                                                                            };
                                                                            const descendants = getAllDescendants(folder.id, folders);
                                                                            const foldersToDelete = [folder, ...descendants];
                                                                            const folderIdsToDelete = new Set(foldersToDelete.map(f => f.id));
                                                                            const folderIndices = foldersToDelete.map(f => folders.findIndex(x => x.id === f.id));

                                                                            // Determine destination for orphaned books: parent folder or Inbox
                                                                            const destinationId = folder.parentId || '__inbox__';
                                                                            const destinationFolder = folders.find(f => f.id === destinationId);
                                                                            const destinationName = destinationFolder?.name || 'Inbox';

                                                                            // Collect all books from folders being deleted
                                                                            const allOrphanedBookIds = foldersToDelete.flatMap(f => f.bookIds || []);
                                                                            const uniqueOrphanedBookIds = [...new Set(allOrphanedBookIds)];

                                                                            // Record action for undo (includes orphan relocation info)
                                                                            recordAction({
                                                                                type: 'DELETE_FOLDERS',
                                                                                deletedFolders: foldersToDelete.map(f => ({ ...f })),
                                                                                folderIndices: folderIndices,
                                                                                orphanedBooks: uniqueOrphanedBookIds,
                                                                                orphanDestination: destinationId
                                                                            });

                                                                            // Move orphaned books to destination, then delete folders
                                                                            setFolders(prev => {
                                                                                let updated = prev.map(f => {
                                                                                    if (f.id === destinationId && uniqueOrphanedBookIds.length > 0) {
                                                                                        const existingIds = new Set(f.bookIds || []);
                                                                                        const newBookIds = uniqueOrphanedBookIds.filter(id => !existingIds.has(id));
                                                                                        return { ...f, bookIds: [...newBookIds, ...(f.bookIds || [])] };
                                                                                    }
                                                                                    return f;
                                                                                });
                                                                                return updated.filter(f => !folderIdsToDelete.has(f.id));
                                                                            });

                                                                            // v5.0.0-alpha.58 - Navigate to parent folder instead of All Books
                                                                            if (selectedFolderId === folder.id || folderIdsToDelete.has(selectedFolderId)) {
                                                                                setSelectedFolderId(destinationId);
                                                                            }

                                                                            // Show toast with result
                                                                            if (uniqueOrphanedBookIds.length > 0) {
                                                                                const bookWord = uniqueOrphanedBookIds.length === 1 ? 'book' : 'books';
                                                                                showToast(`Deleted "${folder.name}" — ${uniqueOrphanedBookIds.length} ${bookWord} moved to ${destinationName}`, window.innerWidth / 2, 100);
                                                                            } else {
                                                                                showToast(`Deleted "${folder.name}"`, window.innerWidth / 2, 100);
                                                                            }
                                                                            console.log(`🗑️ Deleted folder "${folder.name}"${descendants.length > 0 ? ` and ${descendants.length} subfolder(s)` : ''}${uniqueOrphanedBookIds.length > 0 ? `, moved ${uniqueOrphanedBookIds.length} books to ${destinationName}` : ''}`);
                                                                        }
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 px-1"
                                                                    title="Delete folder">
                                                                    ×
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Render children if expanded */}
                                                    {hasChildren && isExpanded && children.map(child => renderFolder(child, depth + 1))}
                                                </React.Fragment>
                                            );
                                        };

                                        // Render root folders (parentId: null, excluding Inbox)
                                        return getChildFolders(null).filter(f => f.id !== '__inbox__').map(folder => renderFolder(folder, 0));
                                    })()}
                                    {/* v5.0.0-alpha.52 - Removed bottom "New Folder" button; use "+" on All Books or folder rows instead */}
                                </div>
                            </div>

                            {/* v5.0.0-alpha.91 - Resizable divider */}
                            <div
                                className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors ${isResizingPane ? 'bg-blue-500' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsResizingPane(true);
                                }}
                                title="Drag to resize sidebar"
                            />

                            {/* Right pane: Book list */}
                            <div className="flex-1 bg-white overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                                    <div className="font-medium text-gray-700 flex items-center">
                                        {/* v5.0.0-alpha.80 - Breadcrumb navigation, v5.0.0-alpha.83 - Drop target for folder reparenting */}
                                        {getFolderPath(selectedFolderId).map((folder, idx, arr) => (
                                            <span key={folder.id} className="flex items-center">
                                                {idx > 0 && <span className="mx-1 text-gray-400">›</span>}
                                                {idx === arr.length - 1 ? (
                                                    <span>{folder.name}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => navigateToFolder(folder.id)}
                                                        className={`text-blue-600 hover:text-blue-800 hover:underline px-1 rounded ${breadcrumbDropTargetId === folder.id ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                                                        onDragOver={(e) => {
                                                            // v5.0.0-alpha.85 - Accept folder drags and book drags (but not books on My Library)
                                                            const types = Array.from(e.dataTransfer.types);
                                                            const isFolderDrag = types.includes('application/x-folder-reorder');
                                                            const isBookDrag = types.includes('application/x-readerwrangler');
                                                            // Books can't go to root level (My Library)
                                                            if (isFolderDrag || (isBookDrag && folder.id !== '__library__')) {
                                                                e.preventDefault();
                                                                e.dataTransfer.dropEffect = 'move';
                                                                setBreadcrumbDropTargetId(folder.id);
                                                            }
                                                        }}
                                                        onDragLeave={(e) => {
                                                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                                                setBreadcrumbDropTargetId(null);
                                                            }
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setBreadcrumbDropTargetId(null);

                                                            // Try folder drag first
                                                            const folderData = e.dataTransfer.getData('application/x-folder-reorder');
                                                            if (folderData) {
                                                                try {
                                                                    const { folderIds } = JSON.parse(folderData);
                                                                    const newParentId = folder.id === '__library__' ? null : folder.id;
                                                                    reparentFolder(folderIds, newParentId);
                                                                } catch (err) {
                                                                    console.error('Breadcrumb folder drop error:', err);
                                                                }
                                                                return;
                                                            }

                                                            // Try book drag
                                                            const bookData = e.dataTransfer.getData('application/x-readerwrangler');
                                                            if (bookData && folder.id !== '__library__') {
                                                                try {
                                                                    const { sourceFolder, bookIds } = JSON.parse(bookData);
                                                                    const targetFolder = folders.find(f => f.id === folder.id);
                                                                    if (!targetFolder) return;

                                                                    const existing = new Set(targetFolder.bookIds || []);
                                                                    const newBookIds = bookIds.filter(id => !existing.has(id));

                                                                    if (newBookIds.length === 0) {
                                                                        showToast(bookIds.length === 1 ? 'Book already in folder' : 'Books already in folder', e.clientX, e.clientY);
                                                                    } else {
                                                                        // Move books: add to target, remove from source
                                                                        const sourceFolderObj = folders.find(f => f.id === sourceFolder);
                                                                        const fromIndices = bookIds.map(id => (sourceFolderObj?.bookIds || []).indexOf(id));

                                                                        setFolders(prev => prev.map(f => {
                                                                            if (f.id === folder.id) {
                                                                                return { ...f, bookIds: [...newBookIds, ...(f.bookIds || [])] };
                                                                            }
                                                                            if (f.id === sourceFolder) {
                                                                                return { ...f, bookIds: (f.bookIds || []).filter(id => !bookIds.includes(id)) };
                                                                            }
                                                                            return f;
                                                                        }));

                                                                        recordAction({
                                                                            type: 'MOVE_BOOKS_FOLDER',
                                                                            fromFolderId: sourceFolder,
                                                                            toFolderId: folder.id,
                                                                            bookIds: bookIds,
                                                                            fromIndices: fromIndices,
                                                                            toIndex: 0
                                                                        });
                                                                        console.log(`📦 Moved ${bookIds.length} book(s) to "${folder.name}" via breadcrumb`);
                                                                    }
                                                                    setExplorerSelectedBooks(new Set());
                                                                } catch (err) {
                                                                    console.error('Breadcrumb book drop error:', err);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {folder.name}
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                        <span className="text-sm text-gray-500 ml-2 font-normal">
                                            {(() => {
                                                // v5.0.0-alpha.54 - Show folder count + book count
                                                // v5.0.0-alpha.63 - Handle My Library folder count
                                                const childFolders = selectedFolderId === '__all__'
                                                    ? []
                                                    : selectedFolderId === '__library__'
                                                        ? [getInboxFolder(), ...getChildFolders(null).filter(f => f.id !== '__inbox__')].filter(Boolean)
                                                        : getChildFolders(selectedFolderId);
                                                const folderCount = childFolders.length;
                                                const allBookIds = getFolderBookIds(selectedFolderId);
                                                const filteredCount = allBookIds
                                                    .map(id => books.find(b => b.id === id))
                                                    .filter(book => filterBookForExplorer(book))
                                                    .length;
                                                const totalCount = allBookIds.length;
                                                // v5.0.0-alpha.63 - My Library shows only folders, no books
                                                if (selectedFolderId === '__library__') {
                                                    return `(${folderCount} folders)`;
                                                }
                                                const bookPart = filteredCount === totalCount
                                                    ? `${totalCount} books`
                                                    : `${filteredCount} of ${totalCount} books`;
                                                return folderCount > 0
                                                    ? `(${folderCount} folders, ${bookPart})`
                                                    : `(${bookPart})`;
                                            })()}
                                        </span>
                                        {selectedFolderId === '__all__' && (
                                            <span className="text-xs text-gray-400 ml-2 italic">
                                                — view only, organize from folders
                                            </span>
                                        )}
                                        {selectedFolderId === '__library__' && (
                                            <span className="text-xs text-gray-400 ml-2 italic">
                                                — double-click to open folder
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        {/* v5.0.0-alpha.175.36 - Custom CSS icons for both list and grid */}
                                        <div className="inline-flex rounded border border-gray-300 overflow-hidden">
                                            <button
                                                onClick={() => setExplorerView('list')}
                                                title="List View"
                                                className={`px-3 py-1.5 border-r border-gray-300 ${explorerView === 'list'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '3px'
                                                }}>
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} style={{
                                                            display: 'flex',
                                                            gap: '2px',
                                                            alignItems: 'center'
                                                        }}>
                                                            <span style={{
                                                                background: 'currentColor',
                                                                width: '3px',
                                                                height: '3px',
                                                                borderRadius: '50%',
                                                                display: 'block'
                                                            }}></span>
                                                            <span style={{
                                                                background: 'currentColor',
                                                                width: '11px',
                                                                height: '3px',
                                                                borderRadius: '2px',
                                                                display: 'block'
                                                            }}></span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setExplorerView('covers')}
                                                title="Grid View"
                                                className={`px-3 py-1.5 flex items-center justify-center ${explorerView === 'covers'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 5px)',
                                                    gap: '2px'
                                                }}>
                                                    {[...Array(9)].map((_, i) => (
                                                        <span key={i} style={{
                                                            background: 'currentColor',
                                                            width: '5px',
                                                            height: '5px',
                                                            borderRadius: '1px',
                                                            display: 'block'
                                                        }}></span>
                                                    ))}
                                                </div>
                                            </button>
                                        </div>
                                        {/* Cover size slider (only in cover view) */}
                                        {explorerView === 'covers' && (
                                            <div className="flex items-center gap-2 border-l pl-4">
                                                <span className="text-xs text-gray-500">Size:</span>
                                                <input
                                                    type="range"
                                                    min="4"
                                                    max="60"
                                                    value={explorerCoverCols}
                                                    onChange={(e) => setExplorerCoverCols(parseInt(e.target.value))}
                                                    className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                    title={`${64 - explorerCoverCols} columns`}
                                                />
                                            </div>
                                        )}
                                        {/* Sort status display (in both views) */}
                                        <div className="flex items-center gap-1 border-l pl-4 text-sm">
                                            <span className="text-gray-500">Sort:</span>
                                            <span className="text-gray-700">
                                                {/* v5.0.0-alpha.174 - Multi-column sort display */}
                                                {explorerSort.map((s, i) => {
                                                    const label = s.column === 'custom' ? 'Manual Order' :
                                                                  s.column === 'title' ? 'Name' :
                                                                  s.column === 'author' ? 'Author' :
                                                                  s.column === 'series' ? 'Series' :
                                                                  s.column === 'seriesNum' ? '#' :
                                                                  s.column === 'rating' ? 'Rating' :
                                                                  s.column === 'dateAdded' ? 'Date Added' :
                                                                  s.column === 'price' ? 'Price' :
                                                                  s.column === 'priceGoal' ? 'Goal' :
                                                                  s.column === 'delta' ? 'Under' : s.column;
                                                    const arrow = s.direction === 'asc' ? '▲' : '▼';
                                                    return (i === 0 ? `${label} ${arrow}` : ` → ${label}${arrow}`);
                                                }).join('')}
                                            </span>
                                            {explorerSort[0].column !== 'custom' && (
                                                <>
                                                    {(() => {
                                                        // v5.0.8 - Only All Books blocks manual ordering (books can't be reordered)
                                                        // My Library allows folder reordering in manual mode
                                                        const isReadOnlyView = selectedFolderId === '__all__';
                                                        const tooltipText = isReadOnlyView
                                                            ? 'All Books is a read-only view - no manual ordering'
                                                            : 'Return to Manual Order';

                                                        return (
                                                            <button
                                                                onClick={() => !isReadOnlyView && setExplorerSort([{ column: 'custom', direction: 'asc' }])}
                                                                className={`ml-1 text-base font-bold ${
                                                                    isReadOnlyView
                                                                        ? 'text-gray-300 cursor-not-allowed'
                                                                        : 'text-gray-500 hover:text-red-500'
                                                                }`}
                                                                disabled={isReadOnlyView}
                                                                title={tooltipText}>
                                                                ✕
                                                            </button>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                        {/* v5.0.0-alpha.104 - Column chooser gear icon */}
                                        {explorerView === 'list' && (
                                            <div className="relative ml-4">
                                                <button
                                                    onClick={() => {
                                                        setExplorerColumnMenuOpen(!explorerColumnMenuOpen);
                                                        setExplorerColumnMenuPos(null); // v5.0.0-alpha.107 - Clear context menu position when using gear
                                                    }}
                                                    className="column-chooser-button text-gray-500 hover:text-gray-700 text-lg"
                                                    title="Choose columns">
                                                    ⚙️
                                                </button>
                                                {/* Column chooser dropdown */}
                                                {explorerColumnMenuOpen && (
                                                    <div
                                                        className={`column-chooser-menu bg-white border border-gray-300 rounded shadow-lg p-3 z-50 min-w-[200px] ${
                                                            explorerColumnMenuPos ? 'fixed' : 'absolute right-0 mt-2'
                                                        }`}
                                                        style={explorerColumnMenuPos ? { left: `${explorerColumnMenuPos.x}px`, top: `${explorerColumnMenuPos.y}px` } : {}}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="text-sm font-semibold text-gray-700">Show Columns</div>
                                                            <button
                                                                onClick={() => {
                                                                    setExplorerColumnMenuOpen(false);
                                                                    setExplorerColumnMenuPos(null); // v5.0.0-alpha.107
                                                                }}
                                                                className="text-gray-500 hover:text-gray-700 font-bold text-lg leading-none"
                                                                title="Close">
                                                                ✕
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* v5.0.0-alpha.172 - Dynamic column checkboxes in columnOrder */}
                                                            {(() => {
                                                                const labels = {
                                                                    title: 'Name', author: 'Author', series: 'Series', seriesNum: '#',
                                                                    rating: 'Rating', myRating: 'My Rating', dateAdded: 'Date Added', price: 'Price',
                                                                    priceGoal: 'Goal', delta: 'Under', amazon: 'Amazon'
                                                                };
                                                                return columnOrder.map(colKey => {
                                                                    if (colKey === 'title') {
                                                                        return (
                                                                            <label key={colKey} className="flex items-center gap-2 text-sm text-gray-600 cursor-not-allowed opacity-50">
                                                                                <input type="checkbox" checked={true} disabled className="cursor-not-allowed" />
                                                                                {labels[colKey]} (always visible)
                                                                            </label>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <label key={colKey} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 rounded">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={visibleColumns[colKey]}
                                                                                onChange={() => setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }))}
                                                                                className="cursor-pointer"
                                                                            />
                                                                            {labels[colKey]}
                                                                        </label>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                        <div className="mt-3 pt-2 border-t border-gray-200">
                                                            <button
                                                                onClick={() => {
                                                                    setVisibleColumns({
                                                                        author: true,
                                                                        series: true, // v5.0.0-alpha.171
                                                                        seriesNum: true, // v5.0.0-alpha.171
                                                                        rating: true,
                                                                        dateAdded: true,
                                                                        price: true,
                                                                        priceGoal: true,
                                                                        delta: true,
                                                                        amazon: true
                                                                    });
                                                                }}
                                                                className="text-xs text-blue-600 hover:text-blue-800">
                                                                Show All
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto px-4 pb-4">
                                    {explorerView === 'list' ? (
                                        (() => {
                                            // v5.0.0-alpha.172.1 - Drag handlers for column reordering (config moved to COLUMN_CONFIG)
                                            const handleColumnDragStart = (e, colKey) => {
                                                setDraggingColumn(colKey);
                                                e.dataTransfer.effectAllowed = 'move';
                                                e.dataTransfer.setData('text/plain', colKey);
                                            };

                                            const handleColumnDragOver = (e, colKey) => {
                                                e.preventDefault();
                                                if (!draggingColumn || draggingColumn === colKey) {
                                                    if (headerDropTarget) setHeaderDropTarget(null);
                                                    return;
                                                }
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const midpoint = rect.left + rect.width / 2;
                                                const side = e.clientX < midpoint ? 'left' : 'right';
                                                // Only update if changed (avoid re-renders on every dragover event)
                                                if (!headerDropTarget || headerDropTarget.column !== colKey || headerDropTarget.side !== side) {
                                                    setHeaderDropTarget({ column: colKey, side });
                                                }
                                            };

                                            const handleColumnDrop = (e, colKey) => {
                                                e.preventDefault();
                                                if (!draggingColumn || !headerDropTarget) return;
                                                const newOrder = [...columnOrder];
                                                const dragIndex = newOrder.indexOf(draggingColumn);
                                                newOrder.splice(dragIndex, 1);
                                                let insertIndex = newOrder.indexOf(colKey);
                                                if (headerDropTarget.side === 'right') insertIndex++;
                                                newOrder.splice(insertIndex, 0, draggingColumn);
                                                setColumnOrder(newOrder);
                                                setDraggingColumn(null);
                                                setHeaderDropTarget(null);
                                            };

                                            const handleColumnDragEnd = () => {
                                                setDraggingColumn(null);
                                                setHeaderDropTarget(null);
                                            };

                                            // Calculate table width dynamically based on columnOrder
                                            const tableWidth = 72 + columnOrder.reduce((sum, col) => {
                                                if (col === 'title' || visibleColumns[col]) {
                                                    return sum + columnWidths[col];
                                                }
                                                return sum;
                                            }, 0);

                                            return (
                                        <table className="text-sm" style={{
                                            tableLayout: 'fixed',
                                            width: `${tableWidth}px`
                                        }}>
                                            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                                                <tr className="text-left text-gray-600"
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        // v5.0.0-alpha.108 - Smart positioning to avoid viewport overflow
                                                        const menuWidth = 200;
                                                        const menuHeight = 300;
                                                        let x = e.clientX;
                                                        let y = e.clientY;

                                                        // Adjust if menu would overflow right edge
                                                        if (x + menuWidth > window.innerWidth) {
                                                            x = e.clientX - menuWidth;
                                                        }

                                                        // Adjust if menu would overflow bottom edge
                                                        if (y + menuHeight > window.innerHeight) {
                                                            y = e.clientY - menuHeight;
                                                        }

                                                        setExplorerColumnMenuPos({ x, y });
                                                        setExplorerColumnMenuOpen(true);
                                                    }}>
                                                    {/* v5.0.0-alpha.121 - Checkbox column (styled div, not input) */}
                                                    <th className="p-2" style={{ width: '24px' }}></th>
                                                    <th className="p-2 w-12"></th>
                                                    {/* v5.0.0-alpha.172 - Dynamic column headers (drag to reorder) */}
                                                    {columnOrder.filter(colKey => colKey === 'title' || visibleColumns[colKey]).map(colKey => {
                                                        const config = COLUMN_CONFIG[colKey];
                                                        const isDragging = draggingColumn === colKey;
                                                        const isDropTarget = headerDropTarget?.column === colKey;
                                                        // v5.0.0-alpha.174.2 - Check all sort levels
                                                        const sortIndex = explorerSort.findIndex(s => s.column === config.sortKey);
                                                        const isSorted = sortIndex >= 0;

                                                        return (
                                                            <th
                                                                key={colKey}
                                                                draggable
                                                                onDragStart={(e) => handleColumnDragStart(e, colKey)}
                                                                onDragOver={(e) => handleColumnDragOver(e, colKey)}
                                                                onDragLeave={() => setHeaderDropTarget(null)}
                                                                onDrop={(e) => handleColumnDrop(e, colKey)}
                                                                onDragEnd={handleColumnDragEnd}
                                                                className={`p-2 relative select-none ${config.sortKey ? 'cursor-grab hover:bg-gray-100' : ''} ${config.textCenter ? 'text-center' : ''} ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'bg-blue-50' : ''}`}
                                                                style={{ width: `var(${config.cssVar}, ${columnWidths[colKey]}px)` }}
                                                                title={config.sortKey ? "Click to sort • Shift+Click for secondary column sort" : undefined}
                                                                onClick={config.sortKey ? (e) => {
                                                                    e.stopPropagation();
                                                                    // v5.0.0-alpha.174.4 - Ignore shift in manual mode (no ties to break)
                                                                    const isShiftClick = e.shiftKey && explorerSort[0].column !== 'custom';

                                                                    setExplorerSort(prev => {
                                                                        if (!isShiftClick) {
                                                                            // Normal click: single-column sort
                                                                            const isPrimary = prev[0]?.column === config.sortKey;
                                                                            return [{
                                                                                column: config.sortKey,
                                                                                direction: isPrimary
                                                                                    ? (prev[0].direction === config.defaultDir ? (config.defaultDir === 'asc' ? 'desc' : 'asc') : config.defaultDir)
                                                                                    : config.defaultDir
                                                                            }];
                                                                        } else {
                                                                            // Shift-click: add/toggle secondary sort (max 3 levels)
                                                                            const existingIndex = prev.findIndex(s => s.column === config.sortKey);

                                                                            if (existingIndex >= 0) {
                                                                                // Column already in sort list - toggle direction
                                                                                const updated = [...prev];
                                                                                updated[existingIndex] = {
                                                                                    ...updated[existingIndex],
                                                                                    direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc'
                                                                                };
                                                                                return updated;
                                                                            } else {
                                                                                // Add as next priority (max 3 levels)
                                                                                if (prev.length >= 3) {
                                                                                    return [...prev.slice(0, 2), { column: config.sortKey, direction: config.defaultDir }];
                                                                                } else {
                                                                                    return [...prev, { column: config.sortKey, direction: config.defaultDir }];
                                                                                }
                                                                            }
                                                                        }
                                                                    });
                                                                } : undefined}
                                                            >
                                                                {/* Drop indicator lines */}
                                                                {isDropTarget && headerDropTarget.side === 'left' && (
                                                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 z-20" />
                                                                )}
                                                                {isDropTarget && headerDropTarget.side === 'right' && (
                                                                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 z-20" />
                                                                )}

                                                                {config.label} {isSorted && (
                                                                    <>
                                                                        {/* v5.0.0-alpha.174.2 - Show arrow with priority indicator */}
                                                                        <span className={sortIndex > 0 ? 'text-gray-400 text-sm' : ''}>
                                                                            {explorerSort[sortIndex].direction === 'asc' ? '▲' : '▼'}
                                                                            {sortIndex > 0 && <sub>{sortIndex + 1}</sub>}
                                                                        </span>
                                                                        {sortIndex === 0 && selectedFolderId !== '__all__' && selectedFolderId !== '__library__' && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setExplorerSort([{ column: 'custom', direction: 'asc' }]); }}
                                                                                className="ml-2 text-gray-500 hover:text-red-500 font-bold"
                                                                                title="Return to Manual Order"
                                                                            >✕</button>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {/* Resize handle */}
                                                                {!config.noResize && (
                                                                    <div
                                                                        className={`absolute right-0 top-0 bottom-0 w-1 hover:bg-blue-400 cursor-col-resize ${resizingColumn?.columnId === colKey ? 'bg-blue-500' : 'bg-transparent'}`}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setResizingColumn({ columnId: colKey, startX: e.clientX, startWidth: columnWidths[colKey] });
                                                                        }}
                                                                        title="Drag to resize"
                                                                    />
                                                                )}
                                                            </th>
                                                        );
                                                    })}
                                                    {/* v5.0.0-alpha.113 - Spacer column to absorb extra space */}
                                                    <th className="p-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* v5.0.0-alpha.54 - Folder rows (before books) */}
                                                {(() => {
                                                    // Get child folders (only for user folders, not All Books)
                                                    if (selectedFolderId === '__all__') return null;
                                                    // v5.0.0-alpha.63 - My Library shows Inbox + root folders
                                                    const childFolders = selectedFolderId === '__library__'
                                                        ? [getInboxFolder(), ...getChildFolders(null).filter(f => f.id !== '__inbox__')].filter(Boolean)
                                                        : getChildFolders(selectedFolderId);
                                                    if (childFolders.length === 0) return null;

                                                    // v5.0.0-alpha.66 - In custom mode, use getChildFolders order (respects custom order)
                                                    // In sorted mode, sort alphabetically
                                                    const dir = explorerSort[0].column === 'title' && explorerSort[0].direction === 'desc' ? -1 : 1;
                                                    let sortedFolders;
                                                    if (selectedFolderId === '__library__') {
                                                        // My Library: Inbox first (pinned), then alphabetical or custom
                                                        const inbox = childFolders.find(f => f.id === '__inbox__');
                                                        const others = childFolders.filter(f => f.id !== '__inbox__');
                                                        // In custom mode, use order from getChildFolders; otherwise sort alphabetically
                                                        const sortedOthers = explorerSort[0].column === 'custom'
                                                            ? others
                                                            : [...others].sort((a, b) => dir * a.name.localeCompare(b.name));
                                                        sortedFolders = [inbox, ...sortedOthers].filter(Boolean);
                                                    } else {
                                                        // Regular folder view
                                                        sortedFolders = explorerSort[0].column === 'custom'
                                                            ? childFolders // Already in custom order from getChildFolders
                                                            : [...childFolders].sort((a, b) => dir * a.name.localeCompare(b.name));
                                                    }

                                                    // v5.0.0-alpha.88 - Allow folder reordering in My Library (Inbox protected by isDraggable=false)
                                                    // v5.0.8 - Folders CAN be reordered in My Library (unlike books), just not in All Books
                                                    const canReorderFolders = explorerSort[0].column === 'custom' &&
                                                        selectedFolderId !== '__all__';
                                                    const parentForReorder = selectedFolderId === '__library__' ? null : selectedFolderId;

                                                    // v5.0.0-alpha.169.1 - Filter folders with no matches when filter active (right pane)
                                                    const visibleFolders = hasActiveFilters && !showAllFoldersOverride
                                                        ? sortedFolders.filter(folder => {
                                                            const { matching } = getFilteredFolderCount(folder.id);
                                                            const hasMatchingDescendant = (folderId) => {
                                                                const childFldrs = folders.filter(f => f.parentId === folderId);
                                                                return childFldrs.some(child => {
                                                                    const { matching: childMatching } = getFilteredFolderCount(child.id);
                                                                    return childMatching > 0 || hasMatchingDescendant(child.id);
                                                                });
                                                            };
                                                            return matching > 0 || hasMatchingDescendant(folder.id);
                                                        })
                                                        : sortedFolders;

                                                    // v5.0.0-alpha.65 - Use flatMap to add separator after Inbox in My Library view
                                                    return visibleFolders.flatMap((folder, folderIndex) => {
                                                        // v5.0.0-alpha.67 - Phase A: Enable dragging everywhere (drop determines validity)
                                                        const isDraggable = folder.id !== '__inbox__';

                                                        const row = (
                                                            <tr
                                                                key={`folder-${folder.id}`}
                                                                className={`group cursor-pointer border-b border-gray-100 ${explorerSelectedFolders.has(folder.id) ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                                                style={(() => {
                                                                    // v5.0.0-alpha.73 - Phase C: Visual feedback (blue=valid, red=invalid)
                                                                    // v5.0.0-alpha.147 - Add cut opacity feedback
                                                                    const styles = {};

                                                                    // Drag target feedback
                                                                    if (explorerFolderDragTarget) {
                                                                        if (explorerFolderDragTarget.type === 'reorder' && explorerFolderDragTarget.index === folderIndex) {
                                                                            // Reorder: blue if allowed (custom mode), red if not
                                                                            const color = canReorderFolders ? '#3b82f6' : '#ef4444';
                                                                            if (explorerFolderDragTarget.position === 'before') {
                                                                                styles.borderTop = `3px solid ${color}`;
                                                                            } else {
                                                                                styles.borderBottom = `3px solid ${color}`;
                                                                            }
                                                                        }
                                                                        if (explorerFolderDragTarget.type === 'reparent' && explorerFolderDragTarget.folderId === folder.id) {
                                                                            styles.backgroundColor = '#dbeafe'; // blue-100 (reparent always valid)
                                                                        }
                                                                    }

                                                                    // Cut folder visual feedback
                                                                    if (folderClipboard.operation === 'cut' && folderClipboard.items.includes(folder.id)) {
                                                                        styles.opacity = 0.5;
                                                                    }

                                                                    return styles;
                                                                })()}
                                                                draggable={isDraggable}
                                                                onDragStart={isDraggable ? (e) => {
                                                                    e.stopPropagation();
                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                    e.dataTransfer.setData('application/x-folder-reorder', JSON.stringify({
                                                                        folderIds: explorerSelectedFolders.has(folder.id) && explorerSelectedFolders.size > 1
                                                                            ? [...explorerSelectedFolders]
                                                                            : [folder.id],
                                                                        parentId: parentForReorder
                                                                    }));
                                                                    if (!explorerSelectedFolders.has(folder.id)) {
                                                                        setExplorerSelectedFolders(new Set([folder.id]));
                                                                    }
                                                                } : undefined}
                                                                onDragOver={(e) => {
                                                                    // v5.0.0-alpha.70 - Phase B: Two-target zone detection (optimized)
                                                                    e.preventDefault();
                                                                    e.dataTransfer.dropEffect = 'move';
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const y = e.clientY - rect.top;
                                                                    const height = rect.height;
                                                                    const edgeZone = height * 0.25;

                                                                    let newTarget;
                                                                    if (y < edgeZone) {
                                                                        newTarget = { type: 'reorder', index: folderIndex, position: 'before' };
                                                                    } else if (y > height - edgeZone) {
                                                                        newTarget = { type: 'reorder', index: folderIndex, position: 'after' };
                                                                    } else {
                                                                        newTarget = { type: 'reparent', folderId: folder.id };
                                                                    }
                                                                    // Only update state if target changed
                                                                    const current = explorerFolderDragTarget;
                                                                    if (!current || current.type !== newTarget.type ||
                                                                        current.index !== newTarget.index ||
                                                                        current.position !== newTarget.position ||
                                                                        current.folderId !== newTarget.folderId) {
                                                                        setExplorerFolderDragTarget(newTarget);
                                                                    }
                                                                }}
                                                                onDragLeave={() => setExplorerFolderDragTarget(null)}
                                                                onDrop={(e) => {
                                                                    // v5.0.0-alpha.76 - Phase D: Handle reorder and reparent
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const dragData = JSON.parse(e.dataTransfer.getData('application/x-folder-reorder'));
                                                                        const target = explorerFolderDragTarget;

                                                                        if (target?.type === 'reparent') {
                                                                            // Move folder(s) INTO target folder
                                                                            reparentFolder(dragData.folderIds, target.folderId);
                                                                        } else if (target?.type === 'reorder') {
                                                                            // Reorder within same parent
                                                                            if (canReorderFolders) {
                                                                                if (dragData.parentId === parentForReorder) {
                                                                                    // v5.0.0-alpha.90 - Pass folder.id and position (not visual index)
                                                                                    reorderFoldersInParent(parentForReorder, dragData.folderIds, folder.id, target.position);
                                                                                }
                                                                            } else if (selectedFolderId === '__all__') {
                                                                                showToast("Folder reordering not available in All Books", e.clientX, e.clientY);
                                                                            } else {
                                                                                showToast("Change sort to Manual Order to reorder folders", e.clientX, e.clientY);
                                                                            }
                                                                        }
                                                                    } catch (err) {
                                                                        // Not a folder drag
                                                                    }
                                                                    setExplorerFolderDragTarget(null);
                                                                }}
                                                                onDragEnd={() => {
                                                                    setExplorerFolderDragTarget(null);
                                                                    setBreadcrumbDropTargetId(null); // v5.0.0-alpha.83
                                                                }}
                                                                onClick={(e) => {
                                                                    // v5.0.0-alpha.151 - Skip selection when editing folder name
                                                                    if (editingFolderId === folder.id) return;

                                                                    // Clear book selection when selecting folder
                                                                    setExplorerSelectedBooks(new Set());
                                                                    if (e.ctrlKey || e.metaKey) {
                                                                        setExplorerSelectedFolders(prev => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(folder.id)) next.delete(folder.id);
                                                                            else next.add(folder.id);
                                                                            return next;
                                                                        });
                                                                    } else {
                                                                        setExplorerSelectedFolders(new Set([folder.id]));
                                                                    }
                                                                }}
                                                                onDoubleClick={() => {
                                                                    // v5.0.0-alpha.151 - Skip navigation when editing folder name
                                                                    if (editingFolderId === folder.id) return;

                                                                    // Navigate into folder
                                                                    navigateToFolder(folder.id);
                                                                    // Expand parent if collapsed
                                                                    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, collapsed: false } : f));
                                                                    // Clear selections
                                                                    setExplorerSelectedFolders(new Set());
                                                                    setExplorerSelectedBooks(new Set());
                                                                }}
                                                                onContextMenu={(e) => {
                                                                    // v5.0.0-alpha.146 - Right panel folder context menu
                                                                    e.preventDefault();
                                                                    setFolderContextMenu({
                                                                        folderId: folder.id,
                                                                        x: e.clientX,
                                                                        y: e.clientY,
                                                                        source: 'right' // v5.0.0-alpha.156 - Track which panel triggered menu
                                                                    });
                                                                }}>
                                                                {/* v5.0.0-alpha.123 - Clickable checkbox */}
                                                                <td
                                                                    className="p-2 text-center cursor-pointer"
                                                                    style={{ width: '24px' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExplorerSelectedFolders(prev => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(folder.id)) next.delete(folder.id);
                                                                            else next.add(folder.id);
                                                                            return next;
                                                                        });
                                                                        setExplorerSelectedBooks(new Set());
                                                                    }}>
                                                                    <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center text-xs ${
                                                                        explorerSelectedFolders.has(folder.id)
                                                                            ? 'opacity-100 bg-blue-500 border-blue-500 text-white'
                                                                            : 'opacity-0 group-hover:opacity-100 border-gray-400'
                                                                    }`}>
                                                                        {explorerSelectedFolders.has(folder.id) && '✓'}
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 text-center text-xl">{folder.id === '__inbox__' ? '📥' : '📁'}</td>
                                                                <td className="p-2 font-medium" style={{ width: `var(--col-title, ${columnWidths.title}px)` }}>
                                                                    {/* v5.0.0-alpha.156 - Right panel inline edit with separate state */}
                                                                    {rightPanelEditingId === folder.id ? (
                                                                        <input
                                                                            type="text"
                                                                            value={rightPanelEditingName}
                                                                            onChange={(e) => setRightPanelEditingName(e.target.value)}
                                                                            onBlur={() => {
                                                                                const finalName = (rightPanelPlaceholderMode || !rightPanelEditingName.trim())
                                                                                    ? rightPanelEditingName
                                                                                    : rightPanelEditingName.trim();
                                                                                if (finalName) {
                                                                                    setFolders(prev => prev.map(f =>
                                                                                        f.id === folder.id ? { ...f, name: finalName } : f
                                                                                    ));
                                                                                }
                                                                                setRightPanelEditingId(null);
                                                                                setRightPanelEditingName('');
                                                                                setRightPanelPlaceholderMode(false);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (rightPanelPlaceholderMode && e.key.length === 1) {
                                                                                    setRightPanelEditingName('');
                                                                                    setRightPanelPlaceholderMode(false);
                                                                                    return;
                                                                                }
                                                                                if (e.key === 'Enter') {
                                                                                    const finalName = (rightPanelPlaceholderMode || !rightPanelEditingName.trim())
                                                                                        ? rightPanelEditingName
                                                                                        : rightPanelEditingName.trim();
                                                                                    if (finalName) {
                                                                                        setFolders(prev => prev.map(f =>
                                                                                            f.id === folder.id ? { ...f, name: finalName } : f
                                                                                        ));
                                                                                    }
                                                                                    setRightPanelEditingId(null);
                                                                                    setRightPanelEditingName('');
                                                                                    setRightPanelPlaceholderMode(false);
                                                                                } else if (e.key === 'Escape') {
                                                                                    setRightPanelEditingId(null);
                                                                                    setRightPanelEditingName('');
                                                                                    setRightPanelPlaceholderMode(false);
                                                                                }
                                                                            }}
                                                                            onFocus={(e) => {
                                                                                if (rightPanelPlaceholderMode) {
                                                                                    e.target.setSelectionRange(0, 0);
                                                                                } else {
                                                                                    e.target.select();
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                            className="w-full px-1 py-0.5 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            style={{ color: rightPanelPlaceholderMode ? '#9ca3af' : 'inherit' }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        folder.name
                                                                    )}
                                                                </td>
                                                                {/* v5.0.0-alpha.172.1 - Dynamic placeholder cells for folder rows */}
                                                                {columnOrder.filter(colKey => colKey !== 'title' && visibleColumns[colKey]).map(colKey => (
                                                                    <td key={colKey} className="p-2 text-gray-400" style={{ width: `var(${COLUMN_CONFIG[colKey].cssVar}, ${columnWidths[colKey]}px)` }}>—</td>
                                                                ))}
                                                                <td className="p-2"></td>
                                                            </tr>
                                                        );
                                                        // Add separator line after Inbox when in My Library view
                                                        if (selectedFolderId === '__library__' && folder.id === '__inbox__') {
                                                            return [row, (
                                                                <tr key="inbox-separator" className="h-0">
                                                                    <td colSpan="8" className="p-0"><div className="border-b-2 border-gray-300 my-1"></div></td>
                                                                </tr>
                                                            )];
                                                        }
                                                        return [row];
                                                    });
                                                })()}
                                                {/* Book rows */}
                                                {(() => {
                                                    // Build sorted book list for range selection (with filtering)
                                                    const sortedBooks = getFolderBookIds(selectedFolderId)
                                                        .map(id => books.find(b => b.id === id))
                                                        .filter(book => filterBookForExplorer(book))
                                                        .sort((a, b) => {
                                                            // v5.0.0-alpha.174.2 - Multi-level sorting
                                                            // Special case: custom sort (manual order)
                                                            if (explorerSort[0].column === 'custom') return 0;

                                                            // Apply each sort level in priority order
                                                            for (const sort of explorerSort) {
                                                                const dir = sort.direction === 'asc' ? 1 : -1;
                                                                let comparison = 0;

                                                                if (sort.column === 'title') {
                                                                    comparison = (a.title || '').localeCompare(b.title || '');
                                                                } else if (sort.column === 'author') {
                                                                    comparison = (a.author || '').localeCompare(b.author || '');
                                                                } else if (sort.column === 'series') {
                                                                    comparison = (a.series || '').localeCompare(b.series || '');
                                                                } else if (sort.column === 'seriesNum') {
                                                                    const posA = parseFloat(a.seriesPosition) || Infinity;
                                                                    const posB = parseFloat(b.seriesPosition) || Infinity;
                                                                    comparison = posA - posB;
                                                                } else if (sort.column === 'rating') {
                                                                    comparison = (a.rating || 0) - (b.rating || 0);
                                                                } else if (sort.column === 'myRating') {
                                                                    // v5.0.0-alpha.175.31 - Personal rating (unrated books always sort to end)
                                                                    const ratingA = a.myRating || 0;
                                                                    const ratingB = b.myRating || 0;
                                                                    // Unrated (0) always at end
                                                                    if (ratingA === 0 && ratingB > 0) comparison = 1;
                                                                    else if (ratingB === 0 && ratingA > 0) comparison = -1;
                                                                    else comparison = ratingA - ratingB;
                                                                } else if (sort.column === 'dateAdded') {
                                                                    const dateA = parseBookDate(a.acquired || a.addedToWishlist);
                                                                    const dateB = parseBookDate(b.acquired || b.addedToWishlist);
                                                                    comparison = dateA - dateB;
                                                                } else if (sort.column === 'price') {
                                                                    comparison = (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity);
                                                                } else if (sort.column === 'priceGoal') {
                                                                    comparison = (a.priceTrigger ?? Infinity) - (b.priceTrigger ?? Infinity);
                                                                } else if (sort.column === 'delta') {
                                                                    const deltaA = (a.priceTrigger != null && a.currentPrice != null) ? (a.priceTrigger - a.currentPrice) : -Infinity;
                                                                    const deltaB = (b.priceTrigger != null && b.currentPrice != null) ? (b.priceTrigger - b.currentPrice) : -Infinity;
                                                                    comparison = deltaA - deltaB;
                                                                }

                                                                // If this level produces a non-zero result, use it
                                                                if (comparison !== 0) {
                                                                    return dir * comparison;
                                                                }
                                                                // Otherwise continue to next sort level
                                                            }

                                                            return 0; // All levels equal
                                                        });
                                                    return sortedBooks.map((book, index) => (
                                                        <tr
                                                            key={book.id}
                                                            className={`group cursor-pointer border-b border-gray-100 ${explorerSelectedBooks.has(book.id) ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                                            style={(() => {
                                                                const styles = {};
                                                                // Reorder target feedback
                                                                if (explorerReorderTarget === index) {
                                                                    styles.borderTop = `3px solid ${explorerSort[0].column === 'custom' && selectedFolderId !== '__all__' ? '#3b82f6' : '#f87171'}`;
                                                                }
                                                                // v5.0.6 - Hidden book visual feedback (check both current and legacy formats)
                                                                if (hiddenInstances.has(book._instanceId) || book.isHidden) {
                                                                    styles.opacity = 0.4;
                                                                }
                                                                // v5.0.0-alpha.168 - Cut book visual feedback (takes precedence over hidden)
                                                                if (clipboard?.type === 'cut' && clipboard?.bookIds?.includes(book.id)) {
                                                                    styles.opacity = 0.5;
                                                                }
                                                                return styles;
                                                            })()}
                                                            draggable="true"
                                                            onMouseEnter={selectedFolderId === '__all__' ? (e) => {
                                                                // Clear any pending hide timeout
                                                                if (tooltipHideTimeoutRef.current) {
                                                                    clearTimeout(tooltipHideTimeoutRef.current);
                                                                    tooltipHideTimeoutRef.current = null;
                                                                }
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setBookTooltip({ bookId: book.id, x: rect.left, y: rect.top });
                                                            } : undefined}
                                                            onMouseLeave={selectedFolderId === '__all__' ? () => {
                                                                // v5.0.0-alpha.132 - Delay hide to allow cursor to reach tooltip
                                                                tooltipHideTimeoutRef.current = setTimeout(() => {
                                                                    setBookTooltip(null);
                                                                }, 150);
                                                            } : undefined}
                                                            onDragStart={(e) => {
                                                                e.stopPropagation();
                                                                e.dataTransfer.effectAllowed = 'copyMove';
                                                                const dragData = {
                                                                    sourceFolder: selectedFolderId, // '__all__' for All Books
                                                                    bookIds: explorerSelectedBooks.has(book.id) && explorerSelectedBooks.size > 1
                                                                        ? [...explorerSelectedBooks]
                                                                        : [book.id]
                                                                };
                                                                e.dataTransfer.setData('application/x-readerwrangler', JSON.stringify(dragData));
                                                                setExplorerDragData(dragData); // Store for validity checks
                                                                if (!explorerSelectedBooks.has(book.id)) {
                                                                    setExplorerSelectedBooks(new Set([book.id]));
                                                                }
                                                                setExplorerDragBookId(book.id);
                                                            }}
                                                            onDragOver={(e) => {
                                                                e.preventDefault(); // Allow drop event to fire
                                                                e.dataTransfer.dropEffect = 'move'; // Must be 'move' for onDrop to fire
                                                                setExplorerReorderTarget(index); // Always show target (styled by allowed state)
                                                            }}
                                                            onDragLeave={() => setExplorerReorderTarget(null)}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (explorerSort[0].column === 'custom' && selectedFolderId !== '__all__' && selectedFolderId !== '__library__') {
                                                                    const dragData = JSON.parse(e.dataTransfer.getData('application/x-readerwrangler'));
                                                                    if (dragData.sourceFolder === selectedFolderId) {
                                                                        reorderBooksInFolder(selectedFolderId, dragData.bookIds, index);
                                                                    }
                                                                } else if (selectedFolderId === '__all__' || selectedFolderId === '__library__') {
                                                                    showToast('Manual ordering not available in All Books and My Library. These views aggregate books from multiple folders. Use column sorting instead.', e.clientX, e.clientY);
                                                                } else if (explorerSort[0].column !== 'custom') {
                                                                    showToast('Clear sort to reorder', e.clientX, e.clientY);
                                                                }
                                                                setExplorerReorderTarget(null);
                                                                setExplorerDragBookId(null);
                                                            }}
                                                            onDragEnd={() => {
                                                                setExplorerDragBookId(null);
                                                                setExplorerDropTargetId(null);
                                                                setExplorerReorderTarget(null);
                                                                setExplorerDragData(null);
                                                            }}
                                                            onClick={(e) => {
                                                                // v5.0.0-alpha.124 - Clear folder selection when selecting book (matches folder row behavior)
                                                                setExplorerSelectedFolders(new Set());
                                                                if (e.shiftKey && explorerSelectionAnchor !== null) {
                                                                    // Shift-click: select range from anchor to current
                                                                    const start = Math.min(explorerSelectionAnchor, index);
                                                                    const end = Math.max(explorerSelectionAnchor, index);
                                                                    const rangeIds = sortedBooks.slice(start, end + 1).map(b => b.id);
                                                                    setExplorerSelectedBooks(new Set(rangeIds));
                                                                } else if (e.ctrlKey || e.metaKey) {
                                                                    // Ctrl/Cmd-click: toggle selection, update anchor
                                                                    setExplorerSelectedBooks(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(book.id)) next.delete(book.id);
                                                                        else next.add(book.id);
                                                                        return next;
                                                                    });
                                                                    setExplorerSelectionAnchor(index);
                                                                } else {
                                                                    // Regular click: select just this book, set anchor
                                                                    setExplorerSelectedBooks(new Set([book.id]));
                                                                    setExplorerSelectionAnchor(index);
                                                                }
                                                            }}
                                                            onContextMenu={(e) => {
                                                                // v5.0.0-alpha.165 - Right-click: If book not in selection, select it first
                                                                e.preventDefault();
                                                                if (!explorerSelectedBooks.has(book.id)) {
                                                                    setExplorerSelectedBooks(new Set([book.id]));
                                                                    setExplorerSelectionAnchor(index);
                                                                }
                                                                // Clear folder selection
                                                                setExplorerSelectedFolders(new Set());
                                                                setBookTooltip(null);  // v5.0.0-alpha.165.1 - Close tooltip when opening context menu
                                                                setExplorerBookContextMenu({
                                                                    x: e.clientX,
                                                                    y: e.clientY
                                                                });
                                                            }}
                                                            onDoubleClick={() => openBookModal(book, null)}>
                                                            {/* v5.0.0-alpha.123 - Clickable checkbox */}
                                                            <td
                                                                className="p-2 text-center cursor-pointer"
                                                                style={{ width: '24px' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExplorerSelectedBooks(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(book.id)) next.delete(book.id);
                                                                        else next.add(book.id);
                                                                        return next;
                                                                    });
                                                                    setExplorerSelectedFolders(new Set());
                                                                }}>
                                                                <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center text-xs ${
                                                                    explorerSelectedBooks.has(book.id)
                                                                        ? 'opacity-100 bg-blue-500 border-blue-500 text-white'
                                                                        : 'opacity-0 group-hover:opacity-100 border-gray-400'
                                                                }`}>
                                                                    {explorerSelectedBooks.has(book.id) && '✓'}
                                                                </div>
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="relative" style={{ minWidth: '32px', maxWidth: '48px' }}>
                                                                    <img src={book.coverUrl} alt="" className={`h-12 object-contain rounded ${book.onWishlist ? 'opacity-40' : ''}`} />
                                                                    {/* v5.0.6 - Hidden book overlay */}
                                                                    {(hiddenInstances.has(book._instanceId) || book.isHidden) && (
                                                                        <div className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none">🚫</div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {/* v5.0.0-alpha.172.1 - Dynamic column cells with inline JSX (performance fix) */}
                                                            {columnOrder.filter(colKey => colKey === 'title' || visibleColumns[colKey]).map(colKey => {
                                                                const cfg = COLUMN_CONFIG[colKey];
                                                                // Inline cell rendering - avoids function call overhead
                                                                let content, cellClass = 'p-2';
                                                                switch (colKey) {
                                                                    case 'title':
                                                                        content = book.title;
                                                                        cellClass += ' font-medium';
                                                                        break;
                                                                    case 'author':
                                                                        content = book.author;
                                                                        cellClass += ' text-gray-600';
                                                                        break;
                                                                    case 'series':
                                                                        content = book.series || '-';
                                                                        cellClass += ' text-gray-600 text-xs';
                                                                        break;
                                                                    case 'seriesNum':
                                                                        content = book.seriesPosition || '-';
                                                                        cellClass += ' text-gray-600 text-xs text-center';
                                                                        break;
                                                                    case 'rating':
                                                                        content = book.rating ? `${'★'.repeat(Math.floor(book.rating))}${'☆'.repeat(5 - Math.floor(book.rating))}` : '-';
                                                                        break;
                                                                    case 'myRating':
                                                                        // v5.0.0-alpha.175.31 - Personal rating (blue stars)
                                                                        if (book.myRating && book.myRating > 0) {
                                                                            content = <span style={{ color: '#3b82f6' }}>
                                                                                {`${'★'.repeat(book.myRating)}${'☆'.repeat(5 - book.myRating)}`}
                                                                            </span>;
                                                                        } else {
                                                                            content = <span style={{ color: '#cbd5e1' }}>—</span>;
                                                                        }
                                                                        break;
                                                                    case 'dateAdded': {
                                                                        const dateStr = book.acquired || book.addedToWishlist;
                                                                        content = dateStr
                                                                            ? (/^\d{8,}$/.test(dateStr) ? new Date(Number(dateStr)) : new Date(dateStr))
                                                                                .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                            : '-';
                                                                        cellClass += ' text-gray-500 text-xs';
                                                                        break;
                                                                    }
                                                                    case 'price':
                                                                        content = book.currentPrice != null ? `$${book.currentPrice.toFixed(2)}` : '-';
                                                                        cellClass += book.priceTrigger && book.currentPrice <= book.priceTrigger
                                                                            ? ' text-xs text-green-600 font-semibold'
                                                                            : ' text-xs text-gray-600';
                                                                        break;
                                                                    case 'priceGoal':
                                                                        content = book.priceTrigger != null ? `$${book.priceTrigger.toFixed(2)}` : '-';
                                                                        cellClass += ' text-gray-500 text-xs';
                                                                        break;
                                                                    case 'delta': {
                                                                        if (book.priceTrigger == null || book.currentPrice == null) {
                                                                            content = '-';
                                                                        } else {
                                                                            const delta = book.priceTrigger - book.currentPrice;
                                                                            const isUnder = delta >= 0;
                                                                            content = <span className={isUnder ? 'text-green-600 font-semibold' : 'text-orange-500'}>
                                                                                {isUnder ? `$${delta.toFixed(2)}` : `-$${Math.abs(delta).toFixed(2)}`}
                                                                            </span>;
                                                                        }
                                                                        cellClass += ' text-xs';
                                                                        break;
                                                                    }
                                                                    case 'amazon':
                                                                        content = <a href={getAmazonUrl(book.asin)} target="_blank" rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                                                            onClick={(e) => e.stopPropagation()}>Amazon</a>;
                                                                        cellClass += ' text-center';
                                                                        break;
                                                                    default:
                                                                        content = '-';
                                                                }
                                                                return (
                                                                    <td key={colKey} className={cellClass}
                                                                        style={{ width: `var(${cfg.cssVar}, ${columnWidths[colKey]}px)` }}>
                                                                        {content}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-2"></td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                            );
                                        })()
                                    ) : (
                                        <div className="grid gap-4 pt-1" style={{ gridTemplateColumns: `repeat(${64 - explorerCoverCols}, minmax(40px, 1fr))` }}>
                                            {/* v5.0.0-alpha.54 - Folder tiles (before books) */}
                                            {(() => {
                                                if (selectedFolderId === '__all__') return null;
                                                // v5.0.0-alpha.63 - My Library shows Inbox + root folders
                                                const childFolders = selectedFolderId === '__library__'
                                                    ? [getInboxFolder(), ...getChildFolders(null).filter(f => f.id !== '__inbox__')].filter(Boolean)
                                                    : getChildFolders(selectedFolderId);
                                                if (childFolders.length === 0) return null;

                                                // v5.0.0-alpha.66 - In custom mode, use getChildFolders order (respects custom order)
                                                const dir = explorerSort[0].column === 'title' && explorerSort[0].direction === 'desc' ? -1 : 1;
                                                let sortedFolders;
                                                if (selectedFolderId === '__library__') {
                                                    const inbox = childFolders.find(f => f.id === '__inbox__');
                                                    const others = childFolders.filter(f => f.id !== '__inbox__');
                                                    const sortedOthers = explorerSort[0].column === 'custom'
                                                        ? others
                                                        : [...others].sort((a, b) => dir * a.name.localeCompare(b.name));
                                                    sortedFolders = [inbox, ...sortedOthers].filter(Boolean);
                                                } else {
                                                    sortedFolders = explorerSort[0].column === 'custom'
                                                        ? childFolders
                                                        : [...childFolders].sort((a, b) => dir * a.name.localeCompare(b.name));
                                                }

                                                // v5.0.0-alpha.88 - Allow folder reordering in My Library (Inbox protected by isDraggable=false)
                                                const canReorderFolders = explorerSort[0].column === 'custom' &&
                                                    selectedFolderId !== '__all__';
                                                const parentForReorder = selectedFolderId === '__library__' ? null : selectedFolderId;

                                                // v5.0.0-alpha.169.1 - Filter folders with no matches when filter active (right pane cover view)
                                                const visibleFolders = hasActiveFilters && !showAllFoldersOverride
                                                    ? sortedFolders.filter(folder => {
                                                        const { matching } = getFilteredFolderCount(folder.id);
                                                        const hasMatchingDescendant = (folderId) => {
                                                            const childFldrs = folders.filter(f => f.parentId === folderId);
                                                            return childFldrs.some(child => {
                                                                const { matching: childMatching } = getFilteredFolderCount(child.id);
                                                                return childMatching > 0 || hasMatchingDescendant(child.id);
                                                            });
                                                        };
                                                        return matching > 0 || hasMatchingDescendant(folder.id);
                                                    })
                                                    : sortedFolders;

                                                // v5.0.0-alpha.62 - Scale folder icon responsively with container
                                                return visibleFolders.map((folder, folderIndex) => {
                                                    // v5.0.0-alpha.67 - Phase A: Enable dragging everywhere (drop determines validity)
                                                    const isDraggable = folder.id !== '__inbox__';

                                                    return (
                                                    <div
                                                        key={`folder-${folder.id}`}
                                                        className={`cursor-pointer hover:opacity-80 ${!isDraggable ? 'select-none' : ''} ${explorerSelectedFolders.has(folder.id) ? 'ring-2 ring-blue-400' : ''}`}
                                                        style={(() => {
                                                            // v5.0.0-alpha.73 - Phase C: Visual feedback (blue=valid, red=invalid)
                                                            if (!explorerFolderDragTarget) return {};
                                                            if (explorerFolderDragTarget.type === 'reorder' && explorerFolderDragTarget.index === folderIndex) {
                                                                // Reorder: blue if allowed (custom mode), red if not
                                                                const color = canReorderFolders ? '#3b82f6' : '#ef4444';
                                                                return explorerFolderDragTarget.position === 'before'
                                                                    ? { outline: `3px solid ${color}`, outlineOffset: '2px', borderTop: `3px solid ${color}` }
                                                                    : { outline: `3px solid ${color}`, outlineOffset: '2px', borderBottom: `3px solid ${color}` };
                                                            }
                                                            if (explorerFolderDragTarget.type === 'reparent' && explorerFolderDragTarget.folderId === folder.id) {
                                                                return { outline: '3px solid #3b82f6', outlineOffset: '2px', backgroundColor: '#dbeafe' }; // reparent always valid
                                                            }
                                                            return {};
                                                        })()}
                                                        draggable={isDraggable}
                                                        onDragStart={isDraggable ? (e) => {
                                                            e.stopPropagation();
                                                            e.dataTransfer.effectAllowed = 'move';
                                                            e.dataTransfer.setData('application/x-folder-reorder', JSON.stringify({
                                                                folderIds: explorerSelectedFolders.has(folder.id) && explorerSelectedFolders.size > 1
                                                                    ? [...explorerSelectedFolders]
                                                                    : [folder.id],
                                                                parentId: parentForReorder
                                                            }));
                                                            if (!explorerSelectedFolders.has(folder.id)) {
                                                                setExplorerSelectedFolders(new Set([folder.id]));
                                                            }
                                                        } : undefined}
                                                        onDragOver={(e) => {
                                                            // v5.0.0-alpha.70 - Phase B: Two-target zone detection (optimized)
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = 'move';
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const y = e.clientY - rect.top;
                                                            const height = rect.height;
                                                            const edgeZone = height * 0.25;

                                                            let newTarget;
                                                            if (y < edgeZone) {
                                                                newTarget = { type: 'reorder', index: folderIndex, position: 'before' };
                                                            } else if (y > height - edgeZone) {
                                                                newTarget = { type: 'reorder', index: folderIndex, position: 'after' };
                                                            } else {
                                                                newTarget = { type: 'reparent', folderId: folder.id };
                                                            }
                                                            // Only update state if target changed
                                                            const current = explorerFolderDragTarget;
                                                            if (!current || current.type !== newTarget.type ||
                                                                current.index !== newTarget.index ||
                                                                current.position !== newTarget.position ||
                                                                current.folderId !== newTarget.folderId) {
                                                                setExplorerFolderDragTarget(newTarget);
                                                            }
                                                        }}
                                                        onDragLeave={() => setExplorerFolderDragTarget(null)}
                                                        onDrop={(e) => {
                                                            // v5.0.0-alpha.76 - Phase D: Handle reorder and reparent
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            try {
                                                                const dragData = JSON.parse(e.dataTransfer.getData('application/x-folder-reorder'));
                                                                const target = explorerFolderDragTarget;

                                                                if (target?.type === 'reparent') {
                                                                    // Move folder(s) INTO target folder
                                                                    reparentFolder(dragData.folderIds, target.folderId);
                                                                } else if (target?.type === 'reorder') {
                                                                    // Reorder within same parent
                                                                    if (canReorderFolders) {
                                                                        if (dragData.parentId === parentForReorder) {
                                                                            // v5.0.0-alpha.90 - Pass folder.id and position (not visual index)
                                                                            reorderFoldersInParent(parentForReorder, dragData.folderIds, folder.id, target.position);
                                                                        }
                                                                    } else if (selectedFolderId === '__all__') {
                                                                        showToast("Folder reordering not available in All Books", e.clientX, e.clientY);
                                                                    } else {
                                                                        showToast("Change sort to Manual Order to reorder folders", e.clientX, e.clientY);
                                                                    }
                                                                }
                                                            } catch (err) {
                                                                // Not a folder drag
                                                            }
                                                            setExplorerFolderDragTarget(null);
                                                        }}
                                                        onDragEnd={() => {
                                                            setExplorerFolderDragTarget(null);
                                                            setBreadcrumbDropTargetId(null); // v5.0.0-alpha.83
                                                        }}
                                                        onClick={(e) => {
                                                            setExplorerSelectedBooks(new Set());
                                                            if (e.ctrlKey || e.metaKey) {
                                                                setExplorerSelectedFolders(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(folder.id)) next.delete(folder.id);
                                                                    else next.add(folder.id);
                                                                    return next;
                                                                });
                                                            } else {
                                                                setExplorerSelectedFolders(new Set([folder.id]));
                                                            }
                                                        }}
                                                        onDoubleClick={() => {
                                                            navigateToFolder(folder.id);
                                                            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, collapsed: false } : f));
                                                            setExplorerSelectedFolders(new Set());
                                                            setExplorerSelectedBooks(new Set());
                                                        }}>
                                                        <div className={`aspect-[2/3] ${folder.id === '__inbox__' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} border-2 rounded shadow flex items-center justify-center relative`} style={{ containerType: 'inline-size' }}>
                                                            {/* v5.0.0-alpha.65 - Pin icon for Inbox in My Library view */}
                                                            {selectedFolderId === '__library__' && folder.id === '__inbox__' && (
                                                                <span className="absolute top-1 right-1 text-xs">📌</span>
                                                            )}
                                                            <span style={{ fontSize: '50cqw' }}>{folder.id === '__inbox__' ? '📥' : '📁'}</span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-700 truncate text-center">{folder.name}</div>
                                                    </div>
                                                    );
                                                });
                                            })()}
                                            {/* Book tiles */}
                                            {(() => {
                                                const sortedBooks = getFolderBookIds(selectedFolderId)
                                                    .map(id => books.find(b => b.id === id))
                                                    .filter(book => filterBookForExplorer(book))
                                                    .sort((a, b) => {
                                                        if (explorerSort[0].column === 'custom') return 0;
                                                        const dir = explorerSort[0].direction === 'asc' ? 1 : -1;
                                                        if (explorerSort[0].column === 'title') return dir * (a.title || '').localeCompare(b.title || '');
                                                        if (explorerSort[0].column === 'author') return dir * (a.author || '').localeCompare(b.author || '');
                                                        // v5.0.0-alpha.171 - Series columns sorting
                                                        if (explorerSort[0].column === 'series') return dir * (a.series || '').localeCompare(b.series || '');
                                                        if (explorerSort[0].column === 'seriesNum') {
                                                            const posA = parseFloat(a.seriesPosition) || Infinity;
                                                            const posB = parseFloat(b.seriesPosition) || Infinity;
                                                            return dir * (posA - posB);
                                                        }
                                                        if (explorerSort[0].column === 'rating') return dir * ((a.rating || 0) - (b.rating || 0));
                                                        if (explorerSort[0].column === 'dateAdded') {
                                                            // v5.0.0-alpha.169.5 - Use parseBookDate for proper date comparison
                                                            const dateA = parseBookDate(a.acquired || a.addedToWishlist);
                                                            const dateB = parseBookDate(b.acquired || b.addedToWishlist);
                                                            return dir * (dateA - dateB);
                                                        }
                                                        if (explorerSort[0].column === 'price') {
                                                            const priceA = a.currentPrice ?? Infinity;
                                                            const priceB = b.currentPrice ?? Infinity;
                                                            return dir * (priceA - priceB);
                                                        }
                                                        if (explorerSort[0].column === 'priceGoal') {
                                                            const goalA = a.priceTrigger ?? Infinity;
                                                            const goalB = b.priceTrigger ?? Infinity;
                                                            return dir * (goalA - goalB);
                                                        }
                                                        if (explorerSort[0].column === 'delta') {
                                                            const deltaA = (a.priceTrigger != null && a.currentPrice != null) ? (a.priceTrigger - a.currentPrice) : -Infinity;
                                                            const deltaB = (b.priceTrigger != null && b.currentPrice != null) ? (b.priceTrigger - b.currentPrice) : -Infinity;
                                                            return dir * (deltaA - deltaB);
                                                        }
                                                        return 0;
                                                    });
                                                return sortedBooks.map((book, index) => (
                                                    <div
                                                        key={book.id}
                                                        className={`cursor-pointer hover:opacity-80 ${explorerSelectedBooks.has(book.id) ? 'ring-2 ring-blue-400' : ''}`}
                                                        style={(() => {
                                                            const styles = {};
                                                            // Reorder target feedback
                                                            if (explorerReorderTarget === index) {
                                                                styles.outline = `3px solid ${explorerSort[0].column === 'custom' && selectedFolderId !== '__all__' ? '#3b82f6' : '#f87171'}`;
                                                                styles.outlineOffset = '2px';
                                                            }
                                                            // v5.0.6 - Hidden book visual feedback (check both current and legacy formats)
                                                            if (hiddenInstances.has(book._instanceId) || book.isHidden) {
                                                                styles.opacity = 0.4;
                                                            }
                                                            // v5.0.0-alpha.168 - Cut book visual feedback (takes precedence over hidden)
                                                            if (clipboard?.type === 'cut' && clipboard?.bookIds?.includes(book.id)) {
                                                                styles.opacity = 0.5;
                                                            }
                                                            return styles;
                                                        })()}
                                                        draggable="true"
                                                        onMouseEnter={selectedFolderId === '__all__' ? (e) => {
                                                            // Clear any pending hide timeout
                                                            if (tooltipHideTimeoutRef.current) {
                                                                clearTimeout(tooltipHideTimeoutRef.current);
                                                                tooltipHideTimeoutRef.current = null;
                                                            }
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setBookTooltip({ bookId: book.id, x: rect.left, y: rect.top });
                                                        } : undefined}
                                                        onMouseLeave={selectedFolderId === '__all__' ? () => {
                                                            // v5.0.0-alpha.132 - Delay hide to allow cursor to reach tooltip
                                                            tooltipHideTimeoutRef.current = setTimeout(() => {
                                                                setBookTooltip(null);
                                                            }, 150);
                                                        } : undefined}
                                                        onDragStart={(e) => {
                                                            e.stopPropagation();
                                                            e.dataTransfer.effectAllowed = 'copyMove';
                                                            const dragData = {
                                                                sourceFolder: selectedFolderId, // '__all__' for All Books
                                                                bookIds: explorerSelectedBooks.has(book.id) && explorerSelectedBooks.size > 1
                                                                    ? [...explorerSelectedBooks]
                                                                    : [book.id]
                                                            };
                                                            e.dataTransfer.setData('application/x-readerwrangler', JSON.stringify(dragData));
                                                            setExplorerDragData(dragData); // Store for validity checks in dragOver
                                                            if (!explorerSelectedBooks.has(book.id)) {
                                                                setExplorerSelectedBooks(new Set([book.id]));
                                                            }
                                                            setExplorerDragBookId(book.id);
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault(); // Allow drop event to fire
                                                            e.dataTransfer.dropEffect = 'move'; // Must be 'move' for onDrop to fire
                                                            setExplorerReorderTarget(index); // Always show target (styled red if not allowed)
                                                        }}
                                                        onDragLeave={() => setExplorerReorderTarget(null)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (explorerSort[0].column === 'custom' && selectedFolderId !== '__all__' && selectedFolderId !== '__library__') {
                                                                const dragData = JSON.parse(e.dataTransfer.getData('application/x-readerwrangler'));
                                                                if (dragData.sourceFolder === selectedFolderId) {
                                                                    reorderBooksInFolder(selectedFolderId, dragData.bookIds, index);
                                                                }
                                                            } else if (selectedFolderId === '__all__' || selectedFolderId === '__library__') {
                                                                showToast('Manual ordering not available in All Books and My Library. These views aggregate books from multiple folders. Use column sorting instead.', e.clientX, e.clientY);
                                                            } else if (explorerSort[0].column !== 'custom') {
                                                                showToast('Clear sort to reorder', e.clientX, e.clientY);
                                                            }
                                                            setExplorerReorderTarget(null);
                                                            setExplorerDragBookId(null);
                                                        }}
                                                        onDragEnd={() => {
                                                            setExplorerDragBookId(null);
                                                            setExplorerDropTargetId(null);
                                                            setExplorerReorderTarget(null);
                                                            setExplorerDragData(null);
                                                        }}
                                                        onClick={(e) => {
                                                            if (e.shiftKey && explorerSelectionAnchor !== null) {
                                                                const start = Math.min(explorerSelectionAnchor, index);
                                                                const end = Math.max(explorerSelectionAnchor, index);
                                                                const rangeIds = sortedBooks.slice(start, end + 1).map(b => b.id);
                                                                setExplorerSelectedBooks(new Set(rangeIds));
                                                            } else if (e.ctrlKey || e.metaKey) {
                                                                setExplorerSelectedBooks(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(book.id)) next.delete(book.id);
                                                                    else next.add(book.id);
                                                                    return next;
                                                                });
                                                                setExplorerSelectionAnchor(index);
                                                            } else {
                                                                setExplorerSelectedBooks(new Set([book.id]));
                                                                setExplorerSelectionAnchor(index);
                                                            }
                                                        }}
                                                        onContextMenu={(e) => {
                                                            // v5.0.0-alpha.165 - Right-click: If book not in selection, select it first
                                                            e.preventDefault();
                                                            if (!explorerSelectedBooks.has(book.id)) {
                                                                setExplorerSelectedBooks(new Set([book.id]));
                                                                setExplorerSelectionAnchor(index);
                                                            }
                                                            // Clear folder selection
                                                            setExplorerSelectedFolders(new Set());
                                                            setBookTooltip(null);  // v5.0.0-alpha.165.1 - Close tooltip when opening context menu
                                                            setExplorerBookContextMenu({
                                                                x: e.clientX,
                                                                y: e.clientY
                                                            });
                                                        }}
                                                        onDoubleClick={() => openBookModal(book, null)}>
                                                        <div className="relative">
                                                            <img src={book.coverUrl} alt={book.title} className={`w-full h-auto rounded shadow ${book.onWishlist ? 'opacity-40' : ''}`} />
                                                            {/* v5.0.6 - Hidden book overlay */}
                                                            {(hiddenInstances.has(book._instanceId) || book.isHidden) && (
                                                                <div className="absolute inset-0 flex items-center justify-center text-8xl pointer-events-none">🚫</div>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-700 truncate">{book.title}</div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    {/* v4.16.0.n - Removed floating selection box, now shown in footer */}

                    {/* v4.16.0.az - Context menu with submenus for Move to / Copy to */}
                    {contextMenu && (() => {
                        // v4.1.0.e - Calculate menu position to avoid going off-screen
                        const menuHeight = 400; // Increased for new items
                        const menuWidth = 220;
                        const submenuWidth = 200;
                        const viewportHeight = window.innerHeight;
                        const viewportWidth = window.innerWidth;

                        // Flip up if menu would go below viewport
                        const top = contextMenu.y + menuHeight > viewportHeight
                            ? Math.max(10, contextMenu.y - menuHeight)
                            : contextMenu.y;
                        // Flip left if menu would go past right edge
                        const left = contextMenu.x + menuWidth > viewportWidth
                            ? Math.max(10, contextMenu.x - menuWidth)
                            : contextMenu.x;

                        // v4.16.0.az - Determine submenu position (left or right of main menu)
                        const submenuOnLeft = left + menuWidth + submenuWidth > viewportWidth;

                        // Get other columns for submenus
                        const otherColumns = columns.filter(col => col.id !== contextMenu.columnId);

                        // v4.16.0.az - Helper to handle move operation
                        const handleMoveToColumn = (targetColId) => {
                            const selectedEntries = getSelectedEntries();
                            const toIndex = 0;
                            const entriesToMove = selectedEntries.map(sel => sel.entry);
                            const fromIndices = selectedEntries.map(sel => sel.index);
                            const booksToMove = selectedEntries.map(sel => sel.bookId);
                            const indicesToRemove = new Set(fromIndices);

                            setColumns(columns.map(column => {
                                if (column.id === contextMenu.columnId) {
                                    return { ...column, books: column.books.filter((item, idx) => !indicesToRemove.has(idx)) };
                                }
                                if (column.id === targetColId) {
                                    return { ...column, books: [...entriesToMove, ...column.books] };
                                }
                                return column;
                            }));
                            recordAction({
                                type: 'MOVE_BOOKS',
                                bookIds: booksToMove,
                                entries: entriesToMove,
                                fromColId: contextMenu.columnId,
                                toColId: targetColId,
                                fromIndices: fromIndices,
                                toIndex: toIndex
                            });
                            clearSelection();
                            setContextMenu(null);
                            setContextSubmenu(null);
                        };

                        // v4.16.0.az - Helper to handle copy operation
                        // v4.16.0.be - Capture isHidden for both GUID and legacy entries
                        const handleCopyToColumn = (targetColId) => {
                            const selectedEntries = getSelectedEntries();
                            const toIndex = 0;

                            // Create new GUID-based entries for copied books
                            // v4.16.0.be - Capture hidden state at copy time
                            const newEntries = selectedEntries.map(sel => {
                                const book = books.find(b => b.id === sel.bookId);
                                // v4.16.0.be - Determine hidden state: GUID uses hiddenInstances, legacy uses book.isHidden
                                const sourceIsHidden = sel.instanceId
                                    ? hiddenInstances.has(sel.instanceId)
                                    : (book?.isHidden || false);
                                return {
                                    instanceId: generateInstanceId(),
                                    bookId: sel.bookId,
                                    sourceIsHidden
                                };
                            });

                            // Copy hidden state for instances that were hidden
                            // v4.16.0.be - Use sourceIsHidden (supports legacy entries)
                            const newHiddenInstanceIds = newEntries
                                .filter(entry => entry.sourceIsHidden)
                                .map(entry => entry.instanceId);

                            if (newHiddenInstanceIds.length > 0) {
                                setHiddenInstances(prev => {
                                    const updated = new Set(prev);
                                    newHiddenInstanceIds.forEach(id => updated.add(id));
                                    return updated;
                                });
                            }

                            // Clean entries before storing
                            const cleanEntries = newEntries.map(({ instanceId, bookId }) => ({ instanceId, bookId }));

                            setColumns(columns.map(column => {
                                if (column.id === targetColId) {
                                    return { ...column, books: [...cleanEntries, ...column.books] };
                                }
                                return column;
                            }));
                            recordAction({
                                type: 'COPY_BOOKS',
                                bookIds: selectedEntries.map(sel => sel.bookId),
                                entries: cleanEntries,
                                toColId: targetColId,
                                toIndex: toIndex
                            });
                            clearSelection();
                            setContextMenu(null);
                            setContextSubmenu(null);
                        };

                        // v4.16.0.az - Helper for Cut operation (same as Ctrl+X)
                        const handleCut = () => {
                            const sourcePositions = [];
                            const bookIds = [];
                            for (const key of selectedBooks) {
                                const [columnId, bookId, indexStr] = key.split(':');
                                const index = parseInt(indexStr, 10);
                                sourcePositions.push({ columnId, index, bookId });
                                bookIds.push(bookId);
                            }
                            setClipboard({ type: 'cut', bookIds, sourcePositions });
                            const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} cut`;
                            setClipboardMessage(message);
                            setFooterClipboardVisible(false);
                            setToastVisible(true);
                            setToastAnimating(false);
                            setTimeout(() => {
                                setToastAnimating(true);
                                setTimeout(() => {
                                    setToastVisible(false);
                                    setToastAnimating(false);
                                    setFooterClipboardVisible(true);
                                }, 1000);
                            }, 1500);
                            setContextMenu(null);
                            setContextSubmenu(null);
                        };

                        // v4.16.0.az - Helper for Copy operation (same as Ctrl+C)
                        // v4.16.0.be - Also capture isHidden for legacy entries
                        const handleCopy = () => {
                            const sourcePositions = [];
                            const bookIds = [];
                            for (const key of selectedBooks) {
                                const [columnId, bookId, indexStr] = key.split(':');
                                const index = parseInt(indexStr, 10);
                                const column = columns.find(c => c.id === columnId);
                                const entry = column?.books[index];
                                const instanceId = entry ? getInstanceId(entry) : null;
                                // v4.16.0.be - Determine hidden state: GUID uses hiddenInstances, legacy uses book.isHidden
                                const book = books.find(b => b.id === bookId);
                                const isHidden = instanceId
                                    ? hiddenInstances.has(instanceId)
                                    : (book?.isHidden || false);
                                sourcePositions.push({ columnId, index, bookId, instanceId, isHidden });
                                bookIds.push(bookId);
                            }
                            setClipboard({ type: 'copy', bookIds, sourcePositions });
                            const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} copied`;
                            setClipboardMessage(message);
                            setFooterClipboardVisible(false);
                            setToastVisible(true);
                            setToastAnimating(false);
                            setTimeout(() => {
                                setToastAnimating(true);
                                setTimeout(() => {
                                    setToastVisible(false);
                                    setToastAnimating(false);
                                    setFooterClipboardVisible(true);
                                }, 1000);
                            }, 1500);
                            setContextMenu(null);
                            setContextSubmenu(null);
                        };

                        // v4.16.0.az - Helper for Paste operation (same as Ctrl+V)
                        const handlePaste = () => {
                            if (!clipboard || clipboard.bookIds.length === 0) return;

                            const targetColumnId = contextMenu.columnId;
                            const targetColumn = columns.find(col => col.id === targetColumnId);
                            if (!targetColumn) return;

                            const selectedInTarget = getSelectedEntries().filter(sel => sel.columnId === targetColumnId);
                            const pasteIndex = selectedInTarget.length > 0
                                ? Math.min(...selectedInTarget.map(sel => sel.index))
                                : 0;

                            if (clipboard.type === 'cut') {
                                setColumns(prevColumns => {
                                    const entriesToMove = [];
                                    clipboard.sourcePositions.forEach(pos => {
                                        const sourceCol = prevColumns.find(c => c.id === pos.columnId);
                                        if (sourceCol && sourceCol.books[pos.index]) {
                                            entriesToMove.push(sourceCol.books[pos.index]);
                                        }
                                    });

                                    const indicesToRemoveFromTarget = clipboard.sourcePositions
                                        .filter(pos => pos.columnId === targetColumnId && pos.index < pasteIndex)
                                        .length;
                                    const adjustedPasteIndex = pasteIndex - indicesToRemoveFromTarget;

                                    const newColumns = prevColumns.map(col => {
                                        const indicesToRemove = new Set();
                                        clipboard.sourcePositions.forEach(pos => {
                                            if (pos.columnId === col.id) {
                                                indicesToRemove.add(pos.index);
                                            }
                                        });
                                        return {
                                            ...col,
                                            books: col.books.filter((item, idx) => {
                                                if (typeof item === 'object' && item.type === 'divider') return true;
                                                return !indicesToRemove.has(idx);
                                            })
                                        };
                                    });
                                    const targetIdx = newColumns.findIndex(col => col.id === targetColumnId);
                                    if (targetIdx !== -1) {
                                        const newBooks = [...newColumns[targetIdx].books];
                                        newBooks.splice(adjustedPasteIndex, 0, ...entriesToMove);
                                        newColumns[targetIdx] = { ...newColumns[targetIdx], books: newBooks };
                                    }
                                    return newColumns;
                                });
                                setClipboard(null);
                                setClipboardMessage(null);
                                setToastVisible(false);
                                setToastAnimating(false);
                                setFooterClipboardVisible(false);
                                clearSelection();
                            } else {
                                // Copy: create new entries
                                // v4.16.0.be - Use isHidden captured at copy time (supports legacy entries)
                                const newEntries = clipboard.sourcePositions.map(pos => ({
                                    instanceId: generateInstanceId(),
                                    bookId: pos.bookId,
                                    sourceIsHidden: pos.isHidden // v4.16.0.be - Use captured hidden state
                                }));

                                // v4.16.0.be - Use sourceIsHidden (captured at copy time) instead of checking hiddenInstances
                                const newHiddenInstanceIds = newEntries
                                    .filter(entry => entry.sourceIsHidden)
                                    .map(entry => entry.instanceId);

                                if (newHiddenInstanceIds.length > 0) {
                                    setHiddenInstances(prev => {
                                        const updated = new Set(prev);
                                        newHiddenInstanceIds.forEach(id => updated.add(id));
                                        return updated;
                                    });
                                }

                                const cleanEntries = newEntries.map(({ instanceId, bookId }) => ({ instanceId, bookId }));

                                setColumns(prevColumns => {
                                    return prevColumns.map(col => {
                                        if (col.id === targetColumnId) {
                                            const newBooks = [...col.books];
                                            newBooks.splice(pasteIndex, 0, ...cleanEntries);
                                            return { ...col, books: newBooks };
                                        }
                                        return col;
                                    });
                                });
                                recordAction({
                                    type: 'COPY_BOOKS',
                                    bookIds: clipboard.bookIds,
                                    entries: cleanEntries,
                                    toColId: targetColumnId,
                                    toIndex: pasteIndex
                                });
                            }
                            setContextMenu(null);
                            setContextSubmenu(null);
                        };

                        return (
                        <div className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[60] py-1 min-w-[200px]"
                             style={{
                                 left: `${left}px`,
                                 top: `${top}px`
                             }}
                             onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-b border-gray-200">
                                {selectedBooks.size} book{selectedBooks.size !== 1 ? 's' : ''} selected
                            </div>

                            {/* Move to submenu trigger */}
                            <div className="relative"
                                 onMouseEnter={() => setContextSubmenu('move')}
                                 onMouseLeave={() => setContextSubmenu(null)}>
                                <button className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center justify-between">
                                    <span className="flex items-center gap-2">📁 Move to</span>
                                    <span className="text-gray-400">▶</span>
                                </button>
                                {/* Move to submenu */}
                                {contextSubmenu === 'move' && otherColumns.length > 0 && (
                                    <div className="absolute bg-white border border-gray-300 rounded-lg shadow-xl py-1 min-w-[180px] max-h-[300px] overflow-y-auto"
                                         style={{
                                             top: 0,
                                             [submenuOnLeft ? 'right' : 'left']: '100%'
                                         }}>
                                        {otherColumns.map(col => (
                                            <button
                                                key={col.id}
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 truncate"
                                                onClick={() => handleMoveToColumn(col.id)}>
                                                {col.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Copy to submenu trigger */}
                            <div className="relative"
                                 onMouseEnter={() => setContextSubmenu('copyTo')}
                                 onMouseLeave={() => setContextSubmenu(null)}>
                                <button className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center justify-between">
                                    <span className="flex items-center gap-2">⧉ Copy to</span>
                                    <span className="text-gray-400">▶</span>
                                </button>
                                {/* Copy to submenu */}
                                {contextSubmenu === 'copyTo' && otherColumns.length > 0 && (
                                    <div className="absolute bg-white border border-gray-300 rounded-lg shadow-xl py-1 min-w-[180px] max-h-[300px] overflow-y-auto"
                                         style={{
                                             top: 0,
                                             [submenuOnLeft ? 'right' : 'left']: '100%'
                                         }}>
                                        {otherColumns.map(col => (
                                            <button
                                                key={col.id}
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 truncate"
                                                onClick={() => handleCopyToColumn(col.id)}>
                                                {col.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-200 my-1"></div>

                            {/* Open in Amazon */}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    const selectedBooksList = getSelectedBooksList();
                                    const count = selectedBooksList.length;
                                    if (count > 10) {
                                        alert('Too many books selected. Please select 10 or fewer to open in Amazon.');
                                    } else if (count > 3) {
                                        if (window.confirm(`Open ${count} tabs in Amazon?`)) {
                                            selectedBooksList.forEach(book => {
                                                window.open(getAmazonUrl(book.asin), '_blank');
                                            });
                                        }
                                    } else {
                                        selectedBooksList.forEach(book => {
                                            window.open(getAmazonUrl(book.asin), '_blank');
                                        });
                                    }
                                    setContextMenu(null);
                                    setContextSubmenu(null);
                                }}>
                                🔗 Open in Amazon
                            </button>

                            {/* Copy Title(s) */}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    const selectedBooksList = getSelectedBooksList();
                                    const titles = selectedBooksList.map(book => book.title).join('\n');
                                    navigator.clipboard.writeText(titles);
                                    setContextMenu(null);
                                    setContextSubmenu(null);
                                }}>
                                📝 Copy Title{selectedBooks.size !== 1 ? 's' : ''}
                            </button>

                            {/* v4.21.0.a - Add/Edit Note (single book only) */}
                            {selectedBooks.size === 1 && (() => {
                                const selectedBooksList = getSelectedBooksList();
                                const book = selectedBooksList[0];
                                const hasNote = book?.userNote;
                                return (
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                        onClick={() => {
                                            // Open modal with note editor
                                            const [colId] = [...selectedBooks][0].split(':');
                                            openBookModal(book, colId);
                                            // Set up note editing
                                            setNoteEditContent(book.userNote || '');
                                            setIsEditingNote(true);
                                            setContextMenu(null);
                                            setContextSubmenu(null);
                                        }}>
                                        {hasNote ? '✏️ Edit Note' : '📝 Add Note'}
                                    </button>
                                );
                            })()}

                            {/* v4.20.0.a - Set Price Goal submenu */}
                            <div className="relative"
                                 onMouseEnter={() => setContextSubmenu('priceGoal')}
                                 onMouseLeave={() => setContextSubmenu(null)}>
                                <button className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center justify-between">
                                    <span className="flex items-center gap-2">💰 Set Price Goal</span>
                                    <span className="text-gray-400">▶</span>
                                </button>
                                {/* Price Goal submenu */}
                                {contextSubmenu === 'priceGoal' && (
                                    <div className="absolute bg-white border border-gray-300 rounded-lg shadow-xl py-1 min-w-[140px]"
                                         style={{
                                             top: 0,
                                             [submenuOnLeft ? 'right' : 'left']: '100%'
                                         }}>
                                        {[0.99, 1.99, 2.99, 3.99, 4.99].map(price => (
                                            <button
                                                key={price}
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700"
                                                onClick={async () => {
                                                    const selectedBookIds = getSelectedBookIds();
                                                    const count = selectedBookIds.length;
                                                    setBooks(prev => {
                                                        const updated = prev.map(b =>
                                                            selectedBookIds.includes(b.id) ? { ...b, priceTrigger: price } : b
                                                        );
                                                        saveBooksToIndexedDB(updated);
                                                        return updated;
                                                    });
                                                    // Toast feedback
                                                    setClipboardMessage(`Price goal set to $${price.toFixed(2)} for ${count} book${count !== 1 ? 's' : ''}`);
                                                    setFooterClipboardVisible(false);
                                                    setToastVisible(true);
                                                    setToastAnimating(false);
                                                    setTimeout(() => {
                                                        setToastAnimating(true);
                                                        setTimeout(() => {
                                                            setToastVisible(false);
                                                            setToastAnimating(false);
                                                            setFooterClipboardVisible(true);
                                                        }, 1000);
                                                    }, 1500);
                                                    setContextMenu(null);
                                                    setContextSubmenu(null);
                                                }}>
                                                ${price.toFixed(2)}
                                            </button>
                                        ))}
                                        <button
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700"
                                            onClick={() => {
                                                // v5.0.0-alpha.169.8 - Store Columns selection before opening modal
                                                setBulkPriceBookIds(getSelectedBookIds());
                                                setShowBulkPriceModal(true);
                                                setContextMenu(null);
                                                setContextSubmenu(null);
                                            }}>
                                            Custom...
                                        </button>
                                        <div className="border-t border-gray-200 my-1"></div>
                                        <button
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-red-600"
                                            onClick={async () => {
                                                const selectedBookIds = getSelectedBookIds();
                                                const count = selectedBookIds.length;
                                                setBooks(prev => {
                                                    const updated = prev.map(b =>
                                                        selectedBookIds.includes(b.id) ? { ...b, priceTrigger: null } : b
                                                    );
                                                    saveBooksToIndexedDB(updated);
                                                    return updated;
                                                });
                                                // Toast feedback
                                                setClipboardMessage(`Price goal cleared for ${count} book${count !== 1 ? 's' : ''}`);
                                                setFooterClipboardVisible(false);
                                                setToastVisible(true);
                                                setToastAnimating(false);
                                                setTimeout(() => {
                                                    setToastAnimating(true);
                                                    setTimeout(() => {
                                                        setToastVisible(false);
                                                        setToastAnimating(false);
                                                        setFooterClipboardVisible(true);
                                                    }, 1000);
                                                }, 1500);
                                                setContextMenu(null);
                                                setContextSubmenu(null);
                                            }}>
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-200 my-1"></div>

                            {/* v4.16.0.az - Cut/Copy/Paste with keyboard shortcuts */}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center justify-between"
                                onClick={handleCut}>
                                <span className="flex items-center gap-2">✂️ Cut</span>
                                <span className="text-xs text-gray-400">Ctrl+X</span>
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center justify-between"
                                onClick={handleCopy}>
                                <span className="flex items-center gap-2">📑 Copy</span>
                                <span className="text-xs text-gray-400">Ctrl+C</span>
                            </button>
                            <button
                                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${clipboard && clipboard.bookIds.length > 0 ? 'hover:bg-blue-50 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                                onClick={handlePaste}
                                disabled={!clipboard || clipboard.bookIds.length === 0}>
                                <span className="flex items-center gap-2">📋 Paste</span>
                                <span className="text-xs text-gray-400">Ctrl+V</span>
                            </button>

                            <div className="border-t border-gray-200 my-1"></div>

                            {/* Hide/Unhide Book(s) */}
                            {(() => {
                                const selectedEntries = getSelectedEntries();
                                const allHidden = selectedEntries.every(sel => {
                                    if (sel.instanceId) {
                                        return hiddenInstances.has(sel.instanceId);
                                    } else {
                                        const book = books.find(b => b.id === sel.bookId);
                                        return book?.isHidden;
                                    }
                                });

                                return (
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                        onClick={async () => {
                                            const newHiddenState = !allHidden;
                                            const guidEntries = selectedEntries.filter(sel => sel.instanceId);
                                            const legacyEntries = selectedEntries.filter(sel => !sel.instanceId);

                                            if (guidEntries.length > 0) {
                                                setHiddenInstances(prev => {
                                                    const next = new Set(prev);
                                                    guidEntries.forEach(sel => {
                                                        if (newHiddenState) {
                                                            next.add(sel.instanceId);
                                                        } else {
                                                            next.delete(sel.instanceId);
                                                        }
                                                    });
                                                    return next;
                                                });
                                            }

                                            if (legacyEntries.length > 0) {
                                                const legacyBookIds = legacyEntries.map(sel => sel.bookId);
                                                const updatedBooks = books.map(book => {
                                                    if (legacyBookIds.includes(book.id)) {
                                                        return { ...book, isHidden: newHiddenState };
                                                    }
                                                    return book;
                                                });
                                                setBooks(updatedBooks);
                                                await saveBooksToIndexedDB(updatedBooks);
                                            }

                                            if (legacyEntries.length > 0) {
                                                const previousStates = {};
                                                legacyEntries.forEach(sel => {
                                                    const book = books.find(b => b.id === sel.bookId);
                                                    previousStates[sel.bookId] = book?.isHidden || false;
                                                });
                                                recordAction({
                                                    type: 'TOGGLE_HIDE',
                                                    bookIds: legacyEntries.map(sel => sel.bookId),
                                                    previousStates: previousStates,
                                                    newState: newHiddenState
                                                });
                                            }

                                            clearSelection();
                                            setContextMenu(null);
                                            setContextSubmenu(null);
                                        }}>
                                        {allHidden ? '👁️' : '🚫'} {allHidden ? 'Unhide' : 'Hide'} Book{selectedBooks.size !== 1 ? 's' : ''}
                                    </button>
                                );
                            })()}

                            <div className="border-t border-gray-200 my-1"></div>

                            {/* Delete */}
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                                onClick={() => {
                                    const selectedEntries = getSelectedEntries();
                                    if (selectedEntries.length === 0) {
                                        setContextMenu(null);
                                        setContextSubmenu(null);
                                        return;
                                    }

                                    const bookIdCounts = {};
                                    columns.forEach(col => {
                                        col.books.forEach(entry => {
                                            const bookId = getBookIdFromEntry(entry);
                                            if (bookId) {
                                                bookIdCounts[bookId] = (bookIdCounts[bookId] || 0) + 1;
                                            }
                                        });
                                    });

                                    // v4.16.0.bd - Count how many of each bookId are selected for deletion
                                    const selectedCounts = {};
                                    selectedEntries.forEach(sel => {
                                        selectedCounts[sel.bookId] = (selectedCounts[sel.bookId] || 0) + 1;
                                    });

                                    // v4.16.0.bd - "last copy" = deleting would leave zero copies in library
                                    const lastCopyEntries = [];
                                    const deletableEntries = [];
                                    selectedEntries.forEach(sel => {
                                        const remainingAfterDelete = bookIdCounts[sel.bookId] - selectedCounts[sel.bookId];
                                        if (remainingAfterDelete === 0) {
                                            lastCopyEntries.push(sel);
                                        } else {
                                            deletableEntries.push(sel);
                                        }
                                    });

                                    if (deletableEntries.length > 0) {
                                        const indicesToRemoveByColumn = {};
                                        deletableEntries.forEach(sel => {
                                            if (!indicesToRemoveByColumn[sel.columnId]) {
                                                indicesToRemoveByColumn[sel.columnId] = new Set();
                                            }
                                            indicesToRemoveByColumn[sel.columnId].add(sel.index);
                                        });

                                        setColumns(prevColumns => {
                                            return prevColumns.map(col => {
                                                const indicesToRemove = indicesToRemoveByColumn[col.id];
                                                if (!indicesToRemove) return col;
                                                return {
                                                    ...col,
                                                    books: col.books.filter((_, idx) => !indicesToRemove.has(idx))
                                                };
                                            });
                                        });
                                        clearSelection();
                                    }

                                    if (lastCopyEntries.length > 0) {
                                        setLastCopyDialogData({
                                            lastCopyEntries,
                                            deletedCount: deletableEntries.length
                                        });
                                    }

                                    setContextMenu(null);
                                    setContextSubmenu(null);
                                }}>
                                🗑️ Delete Book{selectedBooks.size !== 1 ? 's' : ''}
                            </button>
                        </div>
                        );
                    })()}

                    {/* v4.27.0 - Divider context menu for tag operations */}
                    {dividerContextMenu && (
                        <div
                            className="fixed bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-50"
                            style={{ left: dividerContextMenu.x, top: dividerContextMenu.y, minWidth: '180px' }}
                            onClick={(e) => e.stopPropagation()}>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    startEditingDivider(dividerContextMenu.columnId, dividerContextMenu.dividerId, dividerContextMenu.divider.label);
                                    setDividerContextMenu(null);
                                }}>
                                ✏️ Rename
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    setDividerTagEditorOpen({
                                        columnId: dividerContextMenu.columnId,
                                        dividerId: dividerContextMenu.dividerId
                                    });
                                    setTagInputValue('');
                                    setDividerContextMenu(null);
                                }}>
                                🏷️ Edit Tags {dividerContextMenu.divider.tags?.length > 0 && `(${dividerContextMenu.divider.tags.length})`}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    // Add divider's tags to all books under this divider
                                    const column = columns.find(c => c.id === dividerContextMenu.columnId);
                                    if (!column) return;
                                    const divTags = dividerContextMenu.divider.tags || [];
                                    if (divTags.length === 0) {
                                        alert('This divider has no tags to add.');
                                        setDividerContextMenu(null);
                                        return;
                                    }
                                    // Find books under this divider (until next divider)
                                    let foundDivider = false;
                                    const booksToTag = [];
                                    for (const entry of column.books) {
                                        if (entry && entry.type === 'divider') {
                                            if (entry.id === dividerContextMenu.dividerId) {
                                                foundDivider = true;
                                            } else if (foundDivider) {
                                                break; // Next divider reached
                                            }
                                        } else if (foundDivider) {
                                            const bookId = getBookIdFromEntry(entry);
                                            if (bookId) booksToTag.push(bookId);
                                        }
                                    }
                                    if (booksToTag.length === 0) {
                                        alert('No books under this divider.');
                                        setDividerContextMenu(null);
                                        return;
                                    }
                                    // Add tags to books
                                    setBooks(prev => {
                                        const updated = prev.map(book => {
                                            if (booksToTag.includes(book.id)) {
                                                const existingTags = book.tags || [];
                                                const newTags = [...new Set([...existingTags, ...divTags])];
                                                return { ...book, tags: newTags };
                                            }
                                            return book;
                                        });
                                        saveBooksToIndexedDB(updated);
                                        return updated;
                                    });
                                    alert(`Added ${divTags.length} tag(s) to ${booksToTag.length} book(s).`);
                                    setDividerContextMenu(null);
                                }}>
                                📚 Add Tags to All Books
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                                onClick={() => {
                                    deleteDivider(dividerContextMenu.columnId, dividerContextMenu.dividerId);
                                    setDividerContextMenu(null);
                                }}>
                                🗑️ Delete Divider
                            </button>
                        </div>
                    )}

                    {/* v4.27.0 - Divider tag editor modal */}
                    {dividerTagEditorOpen && (() => {
                        const column = columns.find(c => c.id === dividerTagEditorOpen.columnId);
                        const divider = column?.books.find(b => b && b.type === 'divider' && b.id === dividerTagEditorOpen.dividerId);
                        if (!divider) return null;
                        const divTags = divider.tags || [];

                        return (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                                 onClick={() => { setDividerTagEditorOpen(null); setTagInputValue(''); }}>
                                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
                                     onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">Edit Tags for "{divider.label}"</h3>
                                        <button onClick={() => { setDividerTagEditorOpen(null); setTagInputValue(''); }}
                                                className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                                    </div>
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                                            {divTags.length > 0 ? divTags.map(tagId => (
                                                <span key={tagId}
                                                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                                    {tagRegistry[tagId]?.label || tagId}
                                                    <button onClick={() => {
                                                        // Remove tag from divider
                                                        setColumns(prev => prev.map(col => {
                                                            if (col.id !== dividerTagEditorOpen.columnId) return col;
                                                            return {
                                                                ...col,
                                                                books: col.books.map(b => {
                                                                    if (b && b.type === 'divider' && b.id === dividerTagEditorOpen.dividerId) {
                                                                        return { ...b, tags: (b.tags || []).filter(t => t !== tagId) };
                                                                    }
                                                                    return b;
                                                                })
                                                            };
                                                        }));
                                                    }}
                                                            className="text-blue-600 hover:text-blue-800 font-bold">×</button>
                                                </span>
                                            )) : <span className="text-gray-400 italic">No tags</span>}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={tagInputValue}
                                                onChange={(e) => setTagInputValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setDividerTagEditorOpen(null);
                                                        setTagInputValue('');
                                                    } else if (e.key === 'Enter') {
                                                        // v4.27.0-alpha.5 - Enter selects top match or creates new tag
                                                        const input = tagInputValue.toLowerCase().trim();
                                                        if (!input) return;
                                                        const allTagsExactMatch = Object.entries(tagRegistry)
                                                            .find(([id, data]) => data.label.toLowerCase() === input);
                                                        const existingTags = Object.entries(tagRegistry)
                                                            .filter(([id, data]) =>
                                                                data.label.toLowerCase().includes(input) && !divTags.includes(id)
                                                            )
                                                            .sort((a, b) => a[1].label.localeCompare(b[1].label));

                                                        if (existingTags.length > 0) {
                                                            // Select top match
                                                            const [tagId] = existingTags[0];
                                                            setColumns(prev => prev.map(col => {
                                                                if (col.id !== dividerTagEditorOpen.columnId) return col;
                                                                return {
                                                                    ...col,
                                                                    books: col.books.map(b => {
                                                                        if (b && b.type === 'divider' && b.id === dividerTagEditorOpen.dividerId) {
                                                                            return { ...b, tags: [...(b.tags || []), tagId] };
                                                                        }
                                                                        return b;
                                                                    })
                                                                };
                                                            }));
                                                            setTagInputValue('');
                                                        } else if (!allTagsExactMatch) {
                                                            // Create new tag
                                                            const newTagId = input.replace(/\s+/g, '-');
                                                            const newTagLabel = tagInputValue.trim();
                                                            setTagRegistry(prev => ({
                                                                ...prev,
                                                                [newTagId]: { label: newTagLabel, count: 0 }
                                                            }));
                                                            setColumns(prev => prev.map(col => {
                                                                if (col.id !== dividerTagEditorOpen.columnId) return col;
                                                                return {
                                                                    ...col,
                                                                    books: col.books.map(b => {
                                                                        if (b && b.type === 'divider' && b.id === dividerTagEditorOpen.dividerId) {
                                                                            return { ...b, tags: [...(b.tags || []), newTagId] };
                                                                        }
                                                                        return b;
                                                                    })
                                                                };
                                                            }));
                                                            setTagInputValue('');
                                                        }
                                                        // If tag already on divider, do nothing
                                                    }
                                                }}
                                                placeholder="Type to add tag..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                autoFocus
                                            />
                                            {tagInputValue && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[200px] overflow-y-auto z-10">
                                                    {(() => {
                                                        const input = tagInputValue.toLowerCase().trim();
                                                        const allTagsExactMatch = Object.entries(tagRegistry)
                                                            .find(([id, data]) => data.label.toLowerCase() === input);
                                                        const existingTags = Object.entries(tagRegistry)
                                                            .filter(([id, data]) =>
                                                                data.label.toLowerCase().includes(input) && !divTags.includes(id)
                                                            )
                                                            .sort((a, b) => a[1].label.localeCompare(b[1].label));
                                                        const showCreate = input && !allTagsExactMatch;
                                                        const tagAlreadyOnDiv = allTagsExactMatch && divTags.includes(allTagsExactMatch[0]);

                                                        return (
                                                            <>
                                                                {showCreate && (
                                                                    <button
                                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 text-blue-600"
                                                                        onClick={() => {
                                                                            const newTagId = input.replace(/\s+/g, '-');
                                                                            const newTagLabel = tagInputValue.trim();
                                                                            setTagRegistry(prev => ({
                                                                                ...prev,
                                                                                [newTagId]: { label: newTagLabel, count: 0 }
                                                                            }));
                                                                            setColumns(prev => prev.map(col => {
                                                                                if (col.id !== dividerTagEditorOpen.columnId) return col;
                                                                                return {
                                                                                    ...col,
                                                                                    books: col.books.map(b => {
                                                                                        if (b && b.type === 'divider' && b.id === dividerTagEditorOpen.dividerId) {
                                                                                            return { ...b, tags: [...(b.tags || []), newTagId] };
                                                                                        }
                                                                                        return b;
                                                                                    })
                                                                                };
                                                                            }));
                                                                            setTagInputValue('');
                                                                        }}>
                                                                        ➕ Create "{tagInputValue.trim()}"
                                                                    </button>
                                                                )}
                                                                {existingTags.map(([tagId, tagData]) => (
                                                                    <button
                                                                        key={tagId}
                                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            setColumns(prev => prev.map(col => {
                                                                                if (col.id !== dividerTagEditorOpen.columnId) return col;
                                                                                return {
                                                                                    ...col,
                                                                                    books: col.books.map(b => {
                                                                                        if (b && b.type === 'divider' && b.id === dividerTagEditorOpen.dividerId) {
                                                                                            return { ...b, tags: [...(b.tags || []), tagId] };
                                                                                        }
                                                                                        return b;
                                                                                    })
                                                                                };
                                                                            }));
                                                                            setTagInputValue('');
                                                                        }}>
                                                                        {tagData.label} ({getTagCount(tagId)})
                                                                    </button>
                                                                ))}
                                                                {existingTags.length === 0 && !showCreate && (
                                                                    <div className="px-3 py-2 text-sm text-gray-400">
                                                                        {tagAlreadyOnDiv ? `"${allTagsExactMatch[1].label}" already added` : 'No matching tags'}
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Books under this divider will inherit these tags when filtering.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* v4.27.0 Phase 3 - Tag Management Modal */}
                    {tagManagementOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                             onClick={() => { setTagManagementOpen(false); setEditingTagId(null); }}>
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
                                 onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                    <h2 className="text-xl font-semibold">Manage Tags</h2>
                                    <button onClick={() => { setTagManagementOpen(false); setEditingTagId(null); }}
                                            className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {Object.keys(tagRegistry).length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">No tags created yet.</p>
                                    ) : (() => {
                                        const sortedTags = Object.entries(tagRegistry).sort((a, b) => a[1].label.localeCompare(b[1].label));
                                        const activeTags = sortedTags.filter(([tagId, data]) => getTagCount(tagId) > 0);
                                        const orphanedTags = sortedTags.filter(([tagId, data]) => getTagCount(tagId) === 0);

                                        return (
                                            <>
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left border-b border-gray-200">
                                                            <th className="py-2 font-semibold">Tag</th>
                                                            <th className="py-2 font-semibold text-center w-20">Books</th>
                                                            <th className="py-2 font-semibold text-right w-32">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {activeTags.map(([tagId, tagData]) => (
                                                            <tr key={tagId} className="border-b border-gray-100 hover:bg-gray-50">
                                                                <td className="py-2">
                                                                    {editingTagId === tagId ? (
                                                                        <input
                                                                            type="text"
                                                                            defaultValue={tagData.label}
                                                                            autoFocus
                                                                            className="px-2 py-1 border border-blue-500 rounded text-sm w-full"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Escape') {
                                                                                    setEditingTagId(null);
                                                                                } else if (e.key === 'Enter') {
                                                                                    const newLabel = e.target.value.trim();
                                                                                    if (newLabel && newLabel !== tagData.label) {
                                                                                        // Rename tag - update registry label only (ID stays the same)
                                                                                        setTagRegistry(prev => ({
                                                                                            ...prev,
                                                                                            [tagId]: { ...prev[tagId], label: newLabel }
                                                                                        }));
                                                                                    }
                                                                                    setEditingTagId(null);
                                                                                }
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                const newLabel = e.target.value.trim();
                                                                                if (newLabel && newLabel !== tagData.label) {
                                                                                    setTagRegistry(prev => ({
                                                                                        ...prev,
                                                                                        [tagId]: { ...prev[tagId], label: newLabel }
                                                                                    }));
                                                                                }
                                                                                setEditingTagId(null);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <span>{tagData.label}</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 text-center text-gray-500">{getTagCount(tagId)}</td>
                                                                <td className="py-2 text-right">
                                                                    <button
                                                                        onClick={() => setEditingTagId(tagId)}
                                                                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded mr-1">
                                                                        Rename
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm(`Delete tag "${tagData.label}"? This will remove it from ${getTagCount(tagId)} book${getTagCount(tagId) !== 1 ? 's' : ''}.`)) {
                                                                                // Remove tag from all books
                                                                                setBooks(prev => {
                                                                                    const updated = prev.map(b => {
                                                                                        if (b.tags && b.tags.includes(tagId)) {
                                                                                            return { ...b, tags: b.tags.filter(t => t !== tagId) };
                                                                                        }
                                                                                        return b;
                                                                                    });
                                                                                    saveBooksToIndexedDB(updated);
                                                                                    return updated;
                                                                                });
                                                                                // Remove tag from all dividers
                                                                                setColumns(prev => prev.map(col => ({
                                                                                    ...col,
                                                                                    books: col.books.map(b => {
                                                                                        if (b && b.type === 'divider' && b.tags?.includes(tagId)) {
                                                                                            return { ...b, tags: b.tags.filter(t => t !== tagId) };
                                                                                        }
                                                                                        return b;
                                                                                    })
                                                                                })));
                                                                                // Remove from registry
                                                                                setTagRegistry(prev => {
                                                                                    const updated = { ...prev };
                                                                                    delete updated[tagId];
                                                                                    return updated;
                                                                                });
                                                                                // Remove from active filter if present
                                                                                setTagFilter(prev => prev.filter(t => t !== tagId));
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
                                                                        Delete
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {orphanedTags.length > 0 && (
                                                    <>
                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                            <h3 className="text-sm font-semibold text-gray-500 mb-2">Orphaned tags (0 books)</h3>
                                                            <table className="w-full text-sm">
                                                                <tbody>
                                                                    {orphanedTags.map(([tagId, tagData]) => (
                                                                        <tr key={tagId} className="border-b border-gray-100 hover:bg-gray-50">
                                                                            <td className="py-2 text-gray-400">{tagData.label}</td>
                                                                            <td className="py-2 text-center text-gray-400 w-20">0</td>
                                                                            <td className="py-2 text-right w-32">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setTagRegistry(prev => {
                                                                                            const updated = { ...prev };
                                                                                            delete updated[tagId];
                                                                                            return updated;
                                                                                        });
                                                                                    }}
                                                                                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
                                                                                    Delete
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setTagRegistry(prev => {
                                                                    const updated = { ...prev };
                                                                    orphanedTags.forEach(([tagId]) => delete updated[tagId]);
                                                                    return updated;
                                                                });
                                                            }}
                                                            className="mt-2 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200">
                                                            Delete all orphaned tags
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* v3.14.0.x - Ghost position controlled via ref in updateGhostPosition */}
                    {isDragging && draggedBook && (
                        <div className="drag-ghost"
                             ref={dragGhostRef}
                             style={{
                                 left: dragPosRef.current.x - 50,
                                 top: dragPosRef.current.y - 75,
                                 width: '100px'
                             }}>
                            {/* Show stacked effect if dragging multiple books */}
                            {/* v4.16.0.d - Use composite key with index for selection check */}
                            {selectedBooks.size > 1 && selectedBooks.has(`${draggedFromColumn}:${draggedBook.id}:${draggedBookIndex}`) && (
                                <>
                                    <div className="absolute" style={{ left: '8px', top: '8px', opacity: 0.4 }}>
                                        <div className="w-full aspect-[2/3] rounded drag-ghost-border bg-blue-100" style={{ width: '100px' }}></div>
                                    </div>
                                    <div className="absolute" style={{ left: '4px', top: '4px', opacity: 0.6 }}>
                                        <div className="w-full aspect-[2/3] rounded drag-ghost-border bg-blue-200" style={{ width: '100px' }}></div>
                                    </div>
                                </>
                            )}
                            {/* Main dragged book */}
                            <div className="relative">
                                {blankImageBooks.has(draggedBook.id) ? (
                                    <div className="w-full aspect-[2/3] rounded drag-ghost-border"
                                         style={{ backgroundColor: '#d4c5a9' }}>
                                        <div className="flex items-center justify-center h-full px-1">
                                            <div className="text-xs font-serif font-bold text-gray-800 text-center leading-tight">
                                                {draggedBook.title.length > 20 ? draggedBook.title.substring(0, 20) + '...' : draggedBook.title}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={coverUrlMap[draggedBook.coverUrl] || draggedBook.coverUrl}
                                         alt={draggedBook.title}
                                         className="w-full rounded drag-ghost-border" />
                                )}
                                {/* Count badge for multiple books */}
                                {/* v4.16.0.d - Use composite key with index for selection check */}
                                {selectedBooks.size > 1 && selectedBooks.has(`${draggedFromColumn}:${draggedBook.id}:${draggedBookIndex}`) && (
                                    <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white">
                                        {selectedBooks.size}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* v4.16.0.au - Drag tooltip showing "Move to X" or "+ Copy to X" */}
                    {isDragging && draggedBook && (
                        <div
                            ref={dragTooltipRef}
                            style={{
                                position: 'fixed',
                                left: dragPosRef.current.x - 50,
                                top: dragPosRef.current.y + 80,
                                display: 'none',
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                zIndex: 10001
                            }}
                        />
                    )}

                    {/* v3.14.0.w - Overlay drop indicator using ref for direct DOM updates */}
                    <div
                        ref={indicatorRef}
                        className="drop-indicator-overlay"
                        style={{
                            display: 'none',
                            position: 'fixed',
                            height: '6px',
                            pointerEvents: 'none',
                            zIndex: 9998
                        }}
                    >
                        <div className="drop-indicator-line" style={{
                            position: 'absolute',
                            top: '2px',
                            left: 0,
                            right: 0,
                            height: '2px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '1px'
                        }} />
                        <div className="drop-indicator-dot" style={{
                            position: 'absolute',
                            top: 0,
                            left: '-3px',
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '50%'
                        }} />
                    </div>

                    {/* v4.16.0.l - Toast notification that animates to footer */}
                    {/* v4.16.0.m - Position above last clicked book, ease-in animation */}
                    {toastVisible && (
                        <div className={`clipboard-toast ${toastAnimating ? 'animating' : ''}`}
                             style={toastAnimating ? {
                                 left: '16px',
                                 top: 'calc(100vh - 22px)',
                                 transform: 'none'
                             } : {
                                 left: `${toastPosition.x}px`,
                                 top: `${toastPosition.y - 40}px`,
                                 transform: 'translateX(-50%)'
                             }}>
                            {clipboardMessage}
                        </div>
                    )}

                    {/* v5.0.0-alpha.98 - Book folder tooltip (All Books view only) */}
                    {bookTooltip && selectedFolderId === '__all__' && (() => {
                        const containingFolders = getFoldersContainingBook(bookTooltip.bookId);
                        if (containingFolders.length === 0) return null;

                        return (
                            <div
                                className="fixed bg-white border border-gray-300 shadow-lg rounded px-3 py-2 text-sm z-50"
                                style={{
                                    left: `${bookTooltip.x + 220}px`,
                                    top: `${bookTooltip.y}px`,
                                    maxWidth: '300px'
                                }}
                                onMouseEnter={() => {
                                    // v5.0.0-alpha.132 - Cancel hide timeout when cursor enters tooltip
                                    if (tooltipHideTimeoutRef.current) {
                                        clearTimeout(tooltipHideTimeoutRef.current);
                                        tooltipHideTimeoutRef.current = null;
                                    }
                                }}
                                onMouseLeave={() => {
                                    // v5.0.0-alpha.132 - Hide immediately when leaving tooltip
                                    if (tooltipHideTimeoutRef.current) {
                                        clearTimeout(tooltipHideTimeoutRef.current);
                                        tooltipHideTimeoutRef.current = null;
                                    }
                                    setBookTooltip(null);
                                }}>
                                <div className="font-semibold text-gray-700 mb-1">Found in:</div>
                                <div className="flex flex-col gap-1">
                                    {containingFolders.map(folder => (
                                        <button
                                            key={folder.id}
                                            onClick={() => {
                                                navigateToFolder(folder.id);
                                                setBookTooltip(null);
                                            }}
                                            className="text-left text-blue-600 hover:text-blue-800 hover:underline">
                                            {folder.id === '__inbox__' ? '📥 ' : '📁 '}{folder.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* v5.0.0-alpha.133 - Folder context menu (left panel) */}
                    {folderContextMenu && (() => {
                        const folder = folders.find(f => f.id === folderContextMenu.folderId);
                        if (!folder) return null;

                        const isSpecialFolder = ['__all__', '__inbox__', '__my__'].includes(folder.id);
                        // v5.0.0-alpha.166.2 - Check if viewing special folder in right panel (can't move folders from virtual views)
                        const isInSpecialFolderView = folderContextMenu.source === 'right' &&
                            ['__all__', '__library__', '__inbox__'].includes(selectedFolderId);
                        const hasChildren = folders.some(f => f.parentId === folder.id);
                        const hasBooks = folder.bookIds && folder.bookIds.length > 0;

                        // v5.0.0-alpha.135 - Helper: Check if targetId is a descendant of folderId
                        const isDescendantOf = (targetId, ancestorId) => {
                            if (!targetId || !ancestorId) return false;
                            let current = folders.find(f => f.id === targetId);
                            while (current) {
                                if (current.id === ancestorId) return true;
                                current = folders.find(f => f.id === current.parentId);
                            }
                            return false;
                        };

                        // v5.0.0-alpha.135 - Helper: Move folder to new parent
                        const moveFolder = (folderId, targetParentId) => {
                            const folderToMove = folders.find(f => f.id === folderId);
                            if (!folderToMove) return;

                            // Prevent circular reference
                            if (targetParentId && (targetParentId === folderId || isDescendantOf(targetParentId, folderId))) {
                                alert("Cannot move folder into itself or its descendants");
                                return;
                            }

                            // Check for large moves
                            const getAllDescendants = (fid) => {
                                const children = folders.filter(f => f.parentId === fid);
                                let descendants = [...children];
                                children.forEach(child => {
                                    descendants = [...descendants, ...getAllDescendants(child.id)];
                                });
                                return descendants;
                            };
                            const descendants = getAllDescendants(folderId);
                            if (descendants.length > 20) {
                                if (!window.confirm(`Move folder with ${descendants.length} subfolders?`)) {
                                    return;
                                }
                            }

                            const oldParentId = folderToMove.parentId;

                            // Record undo
                            recordAction({
                                type: 'MOVE_FOLDER',
                                folderId: folderId,
                                oldParentId: oldParentId,
                                newParentId: targetParentId
                            });

                            // Update folder's parent
                            setFolders(prev => prev.map(f =>
                                f.id === folderId ? { ...f, parentId: targetParentId } : f
                            ));

                            setFolderContextMenu(null);
                            setContextSubmenu(null);

                            const targetFolder = folders.find(f => f.id === targetParentId);
                            const targetName = targetFolder?.name || 'Root';
                            console.log(`📁 Moved "${folderToMove.name}" to "${targetName}"`);
                        };

                        // v5.0.0-alpha.144 - Viewport-aware positioning
                        const menuWidth = 200;
                        const menuHeight = 400; // Approximate max height
                        let menuX = folderContextMenu.x;
                        let menuY = folderContextMenu.y;

                        // Adjust if off-screen right
                        if (menuX + menuWidth > window.innerWidth) {
                            menuX = window.innerWidth - menuWidth - 10;
                        }

                        // Adjust if off-screen bottom
                        if (menuY + menuHeight > window.innerHeight) {
                            menuY = window.innerHeight - menuHeight - 10;
                        }

                        // Ensure not off-screen left/top
                        menuX = Math.max(10, menuX);
                        menuY = Math.max(10, menuY);

                        return (
                            <div
                                className="fixed bg-white border border-gray-300 shadow-lg rounded z-50 py-1 min-w-[200px]"
                                style={{
                                    left: `${menuX}px`,
                                    top: `${menuY}px`
                                }}
                                onClick={(e) => e.stopPropagation()}>

                                {/* Open */}
                                <div
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                    onClick={() => {
                                        navigateToFolder(folder.id);
                                        setFolderContextMenu(null);
                                    }}>
                                    <span>📂</span>
                                    <span>Open</span>
                                </div>

                                {/* Rename */}
                                {!isSpecialFolder && (
                                    <div
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        onClick={() => {
                                            // v5.0.0-alpha.156 - Use separate state based on which panel triggered context menu
                                            if (folderContextMenu.source === 'right') {
                                                // Edit in right panel table
                                                setRightPanelEditingId(folder.id);
                                                setRightPanelEditingName(folder.name);
                                                setRightPanelPlaceholderMode(false);
                                            } else {
                                                // Edit in left panel tree (default)
                                                setEditingFolderId(folder.id);
                                                setEditingFolderName(folder.name);
                                                setIsPlaceholderMode(false);
                                            }
                                            setFolderContextMenu(null);
                                        }}>
                                        <span>✏️</span>
                                        <span>Rename</span>
                                        <span className="ml-auto text-gray-400 text-xs">F2</span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 my-1"></div>

                                {/* Move to - v5.0.0-alpha.137 */}
                                {/* v5.0.0-alpha.166.2 - Disabled when viewing special folders in right panel */}
                                {!isSpecialFolder && (
                                    isInSpecialFolderView ? (
                                        <div
                                            className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3 relative"
                                            title="Cannot move folders from virtual folder views">
                                            <span>➡️</span>
                                            <span>Move to</span>
                                            <span className="ml-auto">▶</span>
                                        </div>
                                    ) : (
                                        <div
                                            className="submenu-trigger px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 relative"
                                            onMouseEnter={() => setContextSubmenu('move-to')}
                                            onMouseLeave={(e) => {
                                                // v5.0.0-alpha.140 - Increased timeout to 600ms for slower mouse movement
                                                setTimeout(() => {
                                                    const activeSubmenu = document.querySelector('.context-submenu:hover');
                                                    const activeTrigger = document.querySelector('.submenu-trigger:hover');
                                                    if (!activeSubmenu && !activeTrigger) {
                                                        setContextSubmenu(null);
                                                    }
                                                }, 600);
                                            }}>
                                            <span>➡️</span>
                                            <span>Move to</span>
                                            <span className="ml-auto">▶</span>

                                        {/* Submenu */}
                                        {contextSubmenu === 'move-to' && (() => {
                                            // v5.0.0-alpha.138 - Use top-level state for expanded folders
                                            const toggleExpand = (folderId, e) => {
                                                e.stopPropagation();
                                                setSubmenuExpandedFolders(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(folderId)) {
                                                        next.delete(folderId);
                                                    } else {
                                                        next.add(folderId);
                                                    }
                                                    return next;
                                                });
                                            };

                                            // Build folder tree with collapse/expand
                                            const buildFolderTree = (parentId, depth = 0) => {
                                                return folders
                                                    .filter(f => f.parentId === parentId && f.id !== folder.id && !isDescendantOf(f.id, folder.id))
                                                    .map(f => {
                                                        const hasChildren = folders.some(child =>
                                                            child.parentId === f.id &&
                                                            child.id !== folder.id &&
                                                            !isDescendantOf(child.id, folder.id)
                                                        );
                                                        const isExpanded = submenuExpandedFolders.has(f.id);

                                                        return (
                                                            <React.Fragment key={f.id}>
                                                                <div
                                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                                                    style={{ paddingLeft: `${8 + depth * 16}px` }}>
                                                                    {/* Chevron */}
                                                                    <span
                                                                        className="w-4 text-center cursor-pointer select-none"
                                                                        onClick={(e) => hasChildren && toggleExpand(f.id, e)}>
                                                                        {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
                                                                    </span>
                                                                    {/* Folder icon and name */}
                                                                    <div
                                                                        className="flex items-center gap-2 flex-1"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            moveFolder(folder.id, f.id);
                                                                        }}>
                                                                        <span>{f.id === folder.parentId ? '✓' : '📁'}</span>
                                                                        <span>{f.name}</span>
                                                                    </div>
                                                                </div>
                                                                {/* Children only if expanded */}
                                                                {hasChildren && isExpanded && buildFolderTree(f.id, depth + 1)}
                                                            </React.Fragment>
                                                        );
                                                    });
                                            };

                                            // v5.0.0-alpha.139 - Removed hooks (useRef/useEffect) from conditional render
                                            // TODO: Add viewport boundary detection properly later
                                            return (
                                                <div
                                                    className="context-submenu absolute left-full top-0 ml-1 bg-white border border-gray-300 shadow-lg rounded py-1 min-w-[400px] max-h-[400px] overflow-y-auto"
                                                    onMouseEnter={() => setContextSubmenu('move-to')}
                                                    onMouseLeave={() => setContextSubmenu(null)}
                                                    onClick={(e) => e.stopPropagation()}>

                                                    {/* Root option */}
                                                    <div
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveFolder(folder.id, null);
                                                        }}>
                                                        <span className="w-4"></span>
                                                        <span>{folder.parentId === null ? '✓' : '📁'}</span>
                                                        <span>Root</span>
                                                    </div>

                                                    {/* Folder tree */}
                                                    {buildFolderTree(null)}
                                                </div>
                                            );
                                        })()}
                                        </div>
                                    )
                                )}

                                {/* Create Subfolder */}
                                <div
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                    onClick={() => {
                                        const newFolder = {
                                            id: `folder-${Date.now()}`,
                                            name: 'New Subfolder',
                                            parentId: folder.id,
                                            bookIds: [],
                                            childFolderIds: [],
                                            collapsed: false
                                        };
                                        recordAction({
                                            type: 'CREATE_FOLDER',
                                            folderId: newFolder.id,
                                            parentId: folder.id,
                                            folder: { ...newFolder }
                                        });
                                        setFolders(prev => [
                                            ...prev.map(f => f.id === folder.id ? { ...f, collapsed: false } : f),
                                            newFolder
                                        ]);
                                        navigateToFolder(newFolder.id);
                                        setEditingFolderId(newFolder.id);
                                        setEditingFolderName('New Subfolder');
                                        setIsPlaceholderMode(true); // v5.0.0-alpha.134 - Show as placeholder
                                        setFolderContextMenu(null);
                                    }}>
                                    <span>➕</span>
                                    <span>Create Subfolder</span>
                                </div>

                                <div className="border-t border-gray-200 my-1"></div>

                                {/* Cut - v5.0.0-alpha.141 */}
                                {!isSpecialFolder && (
                                    <div
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        onClick={() => {
                                            setFolderClipboard({ items: [folder.id], operation: 'cut' });
                                            setFolderContextMenu(null);
                                            console.log(`✂️ Cut folder "${folder.name}"`);
                                        }}>
                                        <span>✂️</span>
                                        <span>Cut</span>
                                        <span className="ml-auto text-xs">Ctrl+X</span>
                                    </div>
                                )}

                                {/* Copy - v5.0.0-alpha.141 */}
                                {!isSpecialFolder && (
                                    <div
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        onClick={() => {
                                            setFolderClipboard({ items: [folder.id], operation: 'copy' });
                                            setFolderContextMenu(null);
                                            console.log(`📋 Copied folder "${folder.name}"`);
                                        }}>
                                        <span>📋</span>
                                        <span>Copy</span>
                                        <span className="ml-auto text-xs">Ctrl+C</span>
                                    </div>
                                )}

                                {/* Paste - v5.0.0-alpha.141 */}
                                {!isSpecialFolder && (
                                    <div
                                        className={`px-4 py-2 flex items-center gap-3 ${
                                            folderClipboard.items.length > 0
                                                ? 'hover:bg-gray-100 cursor-pointer'
                                                : 'text-gray-400 cursor-not-allowed'
                                        }`}
                                        onClick={() => {
                                            if (folderClipboard.items.length === 0) return;

                                            const folderId = folderClipboard.items[0];
                                            const folderToPaste = folders.find(f => f.id === folderId);
                                            if (!folderToPaste) {
                                                setFolderClipboard({ items: [], operation: null });
                                                setFolderContextMenu(null);
                                                return;
                                            }

                                            // Prevent circular reference
                                            const isDescendantOf = (targetId, ancestorId) => {
                                                if (!targetId || !ancestorId) return false;
                                                let current = folders.find(f => f.id === targetId);
                                                while (current) {
                                                    if (current.id === ancestorId) return true;
                                                    current = folders.find(f => f.parentId === current.id);
                                                }
                                                return false;
                                            };
                                            if (folder.id === folderId || isDescendantOf(folder.id, folderId)) {
                                                alert("Cannot paste folder into itself or its descendants");
                                                setFolderContextMenu(null);
                                                return;
                                            }

                                            if (folderClipboard.operation === 'cut') {
                                                // Move folder
                                                const oldParentId = folderToPaste.parentId;
                                                recordAction({
                                                    type: 'CUT_PASTE_FOLDER',
                                                    folderId: folderId,
                                                    oldParentId: oldParentId,
                                                    newParentId: folder.id
                                                });
                                                setFolders(prev => prev.map(f =>
                                                    f.id === folderId ? { ...f, parentId: folder.id } : f
                                                ));
                                                setFolderClipboard({ items: [], operation: null });
                                                console.log(`📌 Pasted (moved) "${folderToPaste.name}" into "${folder.name}"`);
                                            } else if (folderClipboard.operation === 'copy') {
                                                // Copy folder with deep copy
                                                const copyFolderRecursive = (sourceFolderId, newParentId) => {
                                                    const sourceFolder = folders.find(f => f.id === sourceFolderId);
                                                    if (!sourceFolder) return null;

                                                    // Create copy with new ID
                                                    const newId = '__folder__' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                                    const newFolder = {
                                                        ...sourceFolder,
                                                        id: newId,
                                                        name: sourceFolder.name + ' (Copy)',
                                                        parentId: newParentId,
                                                        created: Date.now()
                                                    };

                                                    // Find children and copy recursively
                                                    const children = folders.filter(f => f.parentId === sourceFolderId);
                                                    return { folder: newFolder, children: children.map(child => copyFolderRecursive(child.id, newId)) };
                                                };

                                                const copyTree = copyFolderRecursive(folderId, folder.id);
                                                if (copyTree) {
                                                    const flattenCopyTree = (tree) => {
                                                        const result = [tree.folder];
                                                        tree.children.forEach(child => {
                                                            if (child) result.push(...flattenCopyTree(child));
                                                        });
                                                        return result;
                                                    };
                                                    const newFolders = flattenCopyTree(copyTree);

                                                    recordAction({
                                                        type: 'COPY_PASTE_FOLDER',
                                                        newFolderIds: newFolders.map(f => f.id),
                                                        parentId: folder.id
                                                    });

                                                    setFolders(prev => [...prev, ...newFolders]);
                                                    console.log(`📋 Pasted (copied) "${folderToPaste.name}" into "${folder.name}"`);
                                                }
                                            }
                                            setFolderContextMenu(null);
                                        }}>
                                        <span>📌</span>
                                        <span>Paste</span>
                                        <span className="ml-auto text-xs">Ctrl+V</span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 my-1"></div>

                                {/* Delete Folder */}
                                {!isSpecialFolder && (
                                    <div
                                        className="px-4 py-2 hover:bg-red-50 cursor-pointer flex items-center gap-3 text-red-600"
                                        onClick={() => {
                                            setFolderContextMenu(null);
                                            if (window.confirm(`Delete folder "${folder.name}"?`)) {
                                                const getAllDescendants = (folderId, allFolders) => {
                                                    const children = allFolders.filter(f => f.parentId === folderId);
                                                    let descendants = [...children];
                                                    children.forEach(child => {
                                                        descendants = [...descendants, ...getAllDescendants(child.id, allFolders)];
                                                    });
                                                    return descendants;
                                                };
                                                const descendants = getAllDescendants(folder.id, folders);
                                                const foldersToDelete = [folder, ...descendants];
                                                const folderIdsToDelete = new Set(foldersToDelete.map(f => f.id));
                                                const folderIndices = foldersToDelete.map(f => folders.findIndex(x => x.id === f.id));

                                                const destinationId = folder.parentId || '__inbox__';
                                                const destinationFolder = folders.find(f => f.id === destinationId);
                                                const destinationName = destinationFolder?.name || 'Inbox';

                                                const allOrphanedBookIds = foldersToDelete.flatMap(f => f.bookIds || []);
                                                const uniqueOrphanedBookIds = [...new Set(allOrphanedBookIds)];

                                                recordAction({
                                                    type: 'DELETE_FOLDERS',
                                                    deletedFolders: foldersToDelete.map(f => ({ ...f })),
                                                    folderIndices: folderIndices,
                                                    movedBooks: uniqueOrphanedBookIds.map(bookId => ({
                                                        bookId,
                                                        fromFolderId: foldersToDelete.find(f => f.bookIds?.includes(bookId))?.id,
                                                        toFolderId: destinationId
                                                    }))
                                                });

                                                setFolders(prev => prev
                                                    .filter(f => !folderIdsToDelete.has(f.id))
                                                    .map(f => {
                                                        if (f.id === destinationId) {
                                                            return {
                                                                ...f,
                                                                bookIds: [...(f.bookIds || []), ...uniqueOrphanedBookIds]
                                                            };
                                                        }
                                                        return f;
                                                    })
                                                );

                                                if (selectedFolderId && folderIdsToDelete.has(selectedFolderId)) {
                                                    navigateToFolder(destinationId);
                                                }

                                                console.log(`🗑️ Deleted "${folder.name}" and ${descendants.length} descendant(s), moved ${uniqueOrphanedBookIds.length} book(s) to "${destinationName}"`);
                                            }
                                        }}>
                                        <span>🗑️</span>
                                        <span>Delete Folder</span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 my-1"></div>

                                {/* Folder Properties - v5.0.0-alpha.142 */}
                                <div
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                    onClick={() => {
                                        setFolderPropertiesEditedName(folder.name); // v5.0.0-alpha.143 - Initialize edited name
                                        setFolderPropertiesDialog({ folderId: folder.id });
                                        // v5.0.0-alpha.144 - Initialize dialog position (centered)
                                        setDialogDrag({
                                            isDragging: false,
                                            offsetX: 0,
                                            offsetY: 0,
                                            dialogX: window.innerWidth / 2 - 224, // 224 = half of max-w-md (448px)
                                            dialogY: window.innerHeight / 2 - 200 // Approximate half height
                                        });
                                        setFolderContextMenu(null);
                                    }}>
                                    <span>ℹ️</span>
                                    <span>Folder Properties</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* v5.0.0-alpha.165 - Explorer Book Context Menu */}
                    {explorerBookContextMenu && (() => {
                        // v5.0.0-alpha.166 - Phase 2: Full implementation with Move to / Copy to submenus

                        // Calculate menu position to avoid going off-screen
                        const menuHeight = 530; // v5.0.0-alpha.170 - Increased for Tags submenu (15 items + separators)
                        const menuWidth = 220;
                        const viewportHeight = window.innerHeight;
                        const viewportWidth = window.innerWidth;

                        // Flip up if menu would go below viewport
                        const top = explorerBookContextMenu.y + menuHeight > viewportHeight
                            ? Math.max(10, explorerBookContextMenu.y - menuHeight)
                            : explorerBookContextMenu.y;
                        // Flip left if menu would go past right edge
                        const left = explorerBookContextMenu.x + menuWidth > viewportWidth
                            ? Math.max(10, explorerBookContextMenu.x - menuWidth)
                            : explorerBookContextMenu.x;

                        // v5.0.0-alpha.169.8 - Determine submenu position (left or right of main menu)
                        const submenuWidth = 200;
                        const submenuHeight = 250; // v5.0.0-alpha.169.9 - For price goal submenu
                        const submenuOnLeft = left + menuWidth + submenuWidth > viewportWidth;
                        // v5.0.0-alpha.169.9 - Price Goal is ~12th item (~400px from menu top)
                        const priceGoalItemOffset = 400;
                        const priceGoalSubmenuOverflows = top + priceGoalItemOffset + submenuHeight > viewportHeight;
                        // v5.0.0-alpha.170.1 - Tags is ~11th item (~360px from menu top, after Add Note)
                        const tagsItemOffset = 360;
                        const tagsSubmenuHeight = 300; // Tags submenu can be tall with many tags
                        const tagsSubmenuOverflows = top + tagsItemOffset + tagsSubmenuHeight > viewportHeight;

                        // v5.0.0-alpha.166 - Phase 2: Helper functions for Move to / Copy to

                        // v5.0.0-alpha.166.1 - Check if current folder is special (can't move books from virtual folders)
                        const isSpecialFolder = ['__all__', '__library__', '__inbox__'].includes(selectedFolderId);

                        // Move books to target folder
                        const handleMoveToFolder = (targetFolderId) => {
                            const selectedBookIds = Array.from(explorerSelectedBooks);
                            const currentFolderId = selectedFolderId;

                            // Remove books from current folder
                            setFolders(prev => prev.map(f => {
                                if (f.id === currentFolderId) {
                                    return {
                                        ...f,
                                        bookIds: f.bookIds.filter(id => !selectedBookIds.includes(id))
                                    };
                                }
                                if (f.id === targetFolderId) {
                                    // Add to target folder (at top)
                                    return {
                                        ...f,
                                        bookIds: [...selectedBookIds, ...f.bookIds]
                                    };
                                }
                                return f;
                            }));

                            // Record undo
                            recordAction({
                                type: 'MOVE_BOOKS_TO_FOLDER',
                                bookIds: selectedBookIds,
                                fromFolderId: currentFolderId,
                                toFolderId: targetFolderId
                            });

                            // Clear selection and close menu
                            setExplorerSelectedBooks(new Set());
                            setExplorerBookContextMenu(null);
                            setContextSubmenu(null);

                            const targetFolder = folders.find(f => f.id === targetFolderId);
                            console.log(`📚 Moved ${selectedBookIds.length} book(s) to "${targetFolder?.name || 'Unknown'}"`);
                        };

                        // Copy books to target folder
                        const handleCopyToFolder = (targetFolderId) => {
                            const selectedBookIds = Array.from(explorerSelectedBooks);

                            // Add books to target folder (keep in source)
                            setFolders(prev => prev.map(f => {
                                if (f.id === targetFolderId) {
                                    // Filter out duplicates, then add new books at top
                                    const existingIds = new Set(f.bookIds);
                                    const newBooks = selectedBookIds.filter(id => !existingIds.has(id));
                                    return {
                                        ...f,
                                        bookIds: [...newBooks, ...f.bookIds]
                                    };
                                }
                                return f;
                            }));

                            // Record undo
                            recordAction({
                                type: 'COPY_BOOKS_TO_FOLDER',
                                bookIds: selectedBookIds,
                                toFolderId: targetFolderId
                            });

                            // Clear selection and close menu
                            setExplorerSelectedBooks(new Set());
                            setExplorerBookContextMenu(null);
                            setContextSubmenu(null);

                            const targetFolder = folders.find(f => f.id === targetFolderId);
                            console.log(`📋 Copied ${selectedBookIds.length} book(s) to "${targetFolder?.name || 'Unknown'}"`);
                        };

                        // Build folder tree for submenu (reused for both Move to and Copy to)
                        const buildFolderTree = (parentId, depth = 0) => {
                            return folders
                                .filter(f => f.parentId === parentId && !['__all__'].includes(f.id)) // Exclude special folders
                                .map(f => {
                                    const hasChildren = folders.some(child =>
                                        child.parentId === f.id &&
                                        !['__all__'].includes(child.id)
                                    );
                                    const isExpanded = submenuExpandedFolders.has(f.id);
                                    const isCurrentFolder = f.id === selectedFolderId;

                                    return (
                                        <React.Fragment key={f.id}>
                                            <div
                                                className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${isCurrentFolder ? 'bg-blue-50' : ''}`}
                                                style={{ paddingLeft: `${8 + depth * 16}px` }}>
                                                {/* Chevron */}
                                                <span
                                                    className="w-4 text-center cursor-pointer select-none"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (hasChildren) {
                                                            setSubmenuExpandedFolders(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(f.id)) {
                                                                    next.delete(f.id);
                                                                } else {
                                                                    next.add(f.id);
                                                                }
                                                                return next;
                                                            });
                                                        }
                                                    }}>
                                                    {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
                                                </span>
                                                {/* Folder icon and name */}
                                                <div
                                                    className="flex items-center gap-2 flex-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (contextSubmenu === 'move-to') {
                                                            handleMoveToFolder(f.id);
                                                        } else if (contextSubmenu === 'copy-to') {
                                                            handleCopyToFolder(f.id);
                                                        }
                                                    }}>
                                                    <span>{isCurrentFolder ? '✓' : '📁'}</span>
                                                    <span>{f.name}</span>
                                                </div>
                                            </div>
                                            {/* Children only if expanded */}
                                            {hasChildren && isExpanded && buildFolderTree(f.id, depth + 1)}
                                        </React.Fragment>
                                    );
                                });
                        };

                        return (
                            <div
                                className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[60] py-1 min-w-[200px]"
                                style={{
                                    left: `${left}px`,
                                    top: `${top}px`
                                }}
                                onClick={(e) => e.stopPropagation()}>
                                {/* Header */}
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-b border-gray-200">
                                    {explorerSelectedBooks.size} book{explorerSelectedBooks.size !== 1 ? 's' : ''} selected
                                </div>

                                {/* Move to - v5.0.0-alpha.166 Phase 2 */}
                                {/* v5.0.0-alpha.166.1 - Disabled in special folders (can't move from virtual folders) */}
                                {isSpecialFolder ? (
                                    <div
                                        className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3 relative"
                                        title="Cannot move books from virtual folders">
                                        <span>📁</span>
                                        <span>Move to</span>
                                        <span className="ml-auto">▶</span>
                                    </div>
                                ) : (
                                    <div
                                        className="submenu-trigger px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 relative"
                                        onMouseEnter={() => setContextSubmenu('move-to')}
                                        onMouseLeave={(e) => {
                                            setTimeout(() => {
                                                const activeSubmenu = document.querySelector('.context-submenu:hover');
                                                const activeTrigger = document.querySelector('.submenu-trigger:hover');
                                                if (!activeSubmenu && !activeTrigger) {
                                                    setContextSubmenu(null);
                                                }
                                            }, 600);
                                        }}>
                                        <span>📁</span>
                                        <span>Move to</span>
                                        <span className="ml-auto">▶</span>

                                        {/* Submenu - v5.0.0-alpha.169.8 viewport-aware positioning */}
                                        {contextSubmenu === 'move-to' && (
                                            <div
                                                className="context-submenu absolute top-0 bg-white border border-gray-300 shadow-lg rounded py-1 min-w-[400px] max-h-[400px] overflow-y-auto z-[70]"
                                                style={{ [submenuOnLeft ? 'right' : 'left']: '100%' }}
                                                onMouseEnter={() => setContextSubmenu('move-to')}
                                                onMouseLeave={() => setContextSubmenu(null)}
                                                onClick={(e) => e.stopPropagation()}>
                                                {/* Folder tree */}
                                                {buildFolderTree(null)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Copy to - v5.0.0-alpha.166 Phase 2 */}
                                <div
                                    className="submenu-trigger px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 relative"
                                    onMouseEnter={() => setContextSubmenu('copy-to')}
                                    onMouseLeave={(e) => {
                                        setTimeout(() => {
                                            const activeSubmenu = document.querySelector('.context-submenu:hover');
                                            const activeTrigger = document.querySelector('.submenu-trigger:hover');
                                            if (!activeSubmenu && !activeTrigger) {
                                                setContextSubmenu(null);
                                            }
                                        }, 600);
                                    }}>
                                    <span>📋</span>
                                    <span>Copy to</span>
                                    <span className="ml-auto">▶</span>

                                    {/* Submenu - v5.0.0-alpha.169.8 viewport-aware positioning */}
                                    {contextSubmenu === 'copy-to' && (
                                        <div
                                            className="context-submenu absolute top-0 bg-white border border-gray-300 shadow-lg rounded py-1 min-w-[400px] max-h-[400px] overflow-y-auto z-[70]"
                                            style={{ [submenuOnLeft ? 'right' : 'left']: '100%' }}
                                            onMouseEnter={() => setContextSubmenu('copy-to')}
                                            onMouseLeave={() => setContextSubmenu(null)}
                                            onClick={(e) => e.stopPropagation()}>
                                            {/* Folder tree */}
                                            {buildFolderTree(null)}
                                        </div>
                                    )}
                                </div>

                                {/* v5.0.0-alpha.168.4 - Cut/Copy/Paste right after Move to/Copy to */}
                                <div className="border-t border-gray-200 my-1"></div>

                                {/* Cut - disabled in special folders */}
                                {isSpecialFolder ? (
                                    <div
                                        className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3"
                                        title="Cannot cut books from virtual folders">
                                        <span>✂️</span>
                                        <span>Cut</span>
                                        <span className="ml-auto text-xs">Ctrl+X</span>
                                    </div>
                                ) : (
                                    <div
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        onClick={() => {
                                            const bookIds = Array.from(explorerSelectedBooks);
                                            const sourcePositions = bookIds.map(bookId => ({
                                                bookId,
                                                folderId: selectedFolderId
                                            }));
                                            setClipboard({ type: 'cut', bookIds, sourcePositions });
                                            const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} cut`;
                                            setClipboardMessage(message);
                                            setFooterClipboardVisible(false);
                                            setToastVisible(true);
                                            setToastAnimating(false);
                                            setTimeout(() => {
                                                setToastAnimating(true);
                                                setTimeout(() => {
                                                    setToastVisible(false);
                                                    setToastAnimating(false);
                                                    setFooterClipboardVisible(true);
                                                }, 1000);
                                            }, 1500);
                                            setExplorerBookContextMenu(null);
                                            setContextSubmenu(null);
                                        }}>
                                        <span>✂️</span>
                                        <span>Cut</span>
                                        <span className="ml-auto text-xs text-gray-400">Ctrl+X</span>
                                    </div>
                                )}

                                {/* Copy */}
                                <div
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                    onClick={() => {
                                        const bookIds = Array.from(explorerSelectedBooks);
                                        const sourcePositions = bookIds.map(bookId => ({
                                            bookId,
                                            folderId: selectedFolderId
                                        }));
                                        setClipboard({ type: 'copy', bookIds, sourcePositions });
                                        const message = `${bookIds.length} book${bookIds.length !== 1 ? 's' : ''} copied`;
                                        setClipboardMessage(message);
                                        setFooterClipboardVisible(false);
                                        setToastVisible(true);
                                        setToastAnimating(false);
                                        setTimeout(() => {
                                            setToastAnimating(true);
                                            setTimeout(() => {
                                                setToastVisible(false);
                                                setToastAnimating(false);
                                                setFooterClipboardVisible(true);
                                            }, 1000);
                                        }, 1500);
                                        setExplorerBookContextMenu(null);
                                        setContextSubmenu(null);
                                    }}>
                                    <span>📋</span>
                                    <span>Copy</span>
                                    <span className="ml-auto text-xs text-gray-400">Ctrl+C</span>
                                </div>

                                {/* Paste - always visible, grayed when no clipboard or in special folder */}
                                {(!clipboard || !clipboard.bookIds || clipboard.bookIds.length === 0 || isSpecialFolder) ? (
                                    <div
                                        className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3"
                                        title={isSpecialFolder ? "Cannot paste into virtual folders" : "Nothing to paste"}>
                                        <span>📥</span>
                                        <span>Paste</span>
                                        <span className="ml-auto text-xs">Ctrl+V</span>
                                    </div>
                                ) : (
                                    <div
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        onClick={() => {
                                            const targetFolderId = selectedFolderId;

                                            if (clipboard.type === 'cut') {
                                                const sourcesByFolder = {};
                                                clipboard.sourcePositions.forEach(pos => {
                                                    if (!sourcesByFolder[pos.folderId]) sourcesByFolder[pos.folderId] = [];
                                                    sourcesByFolder[pos.folderId].push(pos.bookId);
                                                });

                                                setFolders(prev => prev.map(folder => {
                                                    if (sourcesByFolder[folder.id]) {
                                                        return {
                                                            ...folder,
                                                            bookIds: folder.bookIds.filter(id => !sourcesByFolder[folder.id].includes(id))
                                                        };
                                                    }
                                                    if (folder.id === targetFolderId) {
                                                        const newBookIds = clipboard.bookIds.filter(id => !folder.bookIds.includes(id));
                                                        return {
                                                            ...folder,
                                                            bookIds: [...folder.bookIds, ...newBookIds]
                                                        };
                                                    }
                                                    return folder;
                                                }));

                                                recordAction({
                                                    type: 'PASTE_BOOKS_CUT',
                                                    bookIds: clipboard.bookIds,
                                                    sourcePositions: clipboard.sourcePositions,
                                                    targetFolderId
                                                });

                                                setClipboard(null);
                                                setClipboardMessage(null);
                                                setFooterClipboardVisible(false);
                                            } else {
                                                setFolders(prev => prev.map(folder => {
                                                    if (folder.id === targetFolderId) {
                                                        const newBookIds = clipboard.bookIds.filter(id => !folder.bookIds.includes(id));
                                                        return {
                                                            ...folder,
                                                            bookIds: [...folder.bookIds, ...newBookIds]
                                                        };
                                                    }
                                                    return folder;
                                                }));

                                                recordAction({
                                                    type: 'PASTE_BOOKS_COPY',
                                                    bookIds: clipboard.bookIds,
                                                    targetFolderId
                                                });
                                            }

                                            setExplorerBookContextMenu(null);
                                            setContextSubmenu(null);
                                        }}>
                                        <span>📥</span>
                                        <span>Paste ({clipboard.bookIds.length})</span>
                                        <span className="ml-auto text-xs text-gray-400">Ctrl+V</span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 my-1"></div>

                                {/* v5.0.0-alpha.167 - Phase 3: Other menu items */}

                                {/* Helper to get selected books as array */}
                                {(() => {
                                    const getSelectedBooksArray = () => {
                                        const selectedIds = Array.from(explorerSelectedBooks);
                                        return selectedIds.map(id => books.find(b => b.id === id)).filter(Boolean);
                                    };

                                    const selectedBooksArray = getSelectedBooksArray();
                                    const count = selectedBooksArray.length;

                                    return (
                                        <>
                                            {/* Open in Amazon - v5.0.0-alpha.167.6: Single book only (popup blockers prevent multiple) */}
                                            {count === 1 ? (
                                                <div
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const book = selectedBooksArray[0];
                                                        window.open(getAmazonUrl(book.asin), '_blank');
                                                        setExplorerBookContextMenu(null);
                                                        setContextSubmenu(null);
                                                    }}>
                                                    <span>🔗</span>
                                                    <span>Open in Amazon</span>
                                                </div>
                                            ) : (
                                                <div
                                                    className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3"
                                                    title="Use Amazon column in List View for multiple books">
                                                    <span>🔗</span>
                                                    <span>Open in Amazon</span>
                                                </div>
                                            )}

                                            {/* Copy Title(s) */}
                                            <div
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                                onClick={() => {
                                                    const titles = selectedBooksArray.map(book => book.title).join('\n');
                                                    navigator.clipboard.writeText(titles);
                                                    setExplorerBookContextMenu(null);
                                                    setContextSubmenu(null);
                                                }}>
                                                <span>📝</span>
                                                <span>Copy Title{count !== 1 ? 's' : ''}</span>
                                            </div>

                                            {/* Add/Edit Note (single book only) */}
                                            {count === 1 ? (
                                                <div
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const book = selectedBooksArray[0];
                                                        // Open modal with note editor (v5.0.0-alpha.167.1 - Fixed to use openBookModal)
                                                        openBookModal(book, null);
                                                        setNoteEditContent(book.userNote || '');
                                                        setIsEditingNote(true);
                                                        setExplorerBookContextMenu(null);
                                                        setContextSubmenu(null);
                                                    }}>
                                                    <span>{selectedBooksArray[0]?.userNote ? '✏️' : '📝'}</span>
                                                    <span>{selectedBooksArray[0]?.userNote ? 'Edit Note' : 'Add Note'}</span>
                                                </div>
                                            ) : (
                                                <div
                                                    className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3"
                                                    title="Notes can only be edited for one book at a time">
                                                    <span>📝</span>
                                                    <span>Add/Edit Note</span>
                                                </div>
                                            )}

                                            {/* v5.0.0-alpha.170.1 - Tags submenu (moved to be with Add Note) */}
                                            <div
                                                className="submenu-trigger px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 relative"
                                                onMouseEnter={() => { setTagInputValue(''); setContextSubmenu('explorer-tags'); }}
                                                onMouseLeave={(e) => {
                                                    setTimeout(() => {
                                                        const activeSubmenu = document.querySelector('.context-submenu:hover');
                                                        const activeTrigger = document.querySelector('.submenu-trigger:hover');
                                                        if (!activeSubmenu && !activeTrigger) {
                                                            setContextSubmenu(null);
                                                        }
                                                    }, 600);
                                                }}>
                                                <span>🏷️</span>
                                                <span>Tags</span>
                                                {(() => {
                                                    // Count total tags across selected books
                                                    const allTags = new Set();
                                                    selectedBooksArray.forEach(b => (b.tags || []).forEach(t => allTags.add(t)));
                                                    return allTags.size > 0 ? <span className="text-xs text-gray-500">({allTags.size})</span> : null;
                                                })()}
                                                <span className="ml-auto">▶</span>

                                                {/* Tags Submenu */}
                                                {contextSubmenu === 'explorer-tags' && (
                                                    <div
                                                        className="context-submenu absolute bg-white border border-gray-300 shadow-lg rounded py-1 min-w-[220px] max-h-[350px] overflow-y-auto z-[70]"
                                                        style={{
                                                            [submenuOnLeft ? 'right' : 'left']: '100%',
                                                            [tagsSubmenuOverflows ? 'bottom' : 'top']: '0'
                                                        }}
                                                        onMouseEnter={() => setContextSubmenu('explorer-tags')}
                                                        onMouseLeave={() => setContextSubmenu(null)}
                                                        onClick={(e) => e.stopPropagation()}>

                                                        {/* Current tags on selected books */}
                                                        {(() => {
                                                            // Get tags that are on ANY of the selected books
                                                            const tagsOnBooks = new Map(); // tagId -> count of books with this tag
                                                            selectedBooksArray.forEach(book => {
                                                                (book.tags || []).forEach(tagId => {
                                                                    tagsOnBooks.set(tagId, (tagsOnBooks.get(tagId) || 0) + 1);
                                                                });
                                                            });

                                                            if (tagsOnBooks.size > 0) {
                                                                return (
                                                                    <>
                                                                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-200">
                                                                            Current Tags
                                                                        </div>
                                                                        {Array.from(tagsOnBooks.entries())
                                                                            .sort((a, b) => (tagRegistry[a[0]]?.label || a[0]).localeCompare(tagRegistry[b[0]]?.label || b[0]))
                                                                            .map(([tagId, bookCount]) => (
                                                                                <div
                                                                                    key={tagId}
                                                                                    className="px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between group">
                                                                                    <span className="flex items-center gap-2">
                                                                                        <span className="text-sm">{tagRegistry[tagId]?.label || tagId}</span>
                                                                                        {bookCount < count && (
                                                                                            <span className="text-xs text-gray-400">({bookCount}/{count})</span>
                                                                                        )}
                                                                                    </span>
                                                                                    <button
                                                                                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity text-sm px-1"
                                                                                        title="Remove tag from selected books"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const selectedBookIds = Array.from(explorerSelectedBooks);
                                                                                            // Remove tag from all selected books
                                                                                            setBooks(prev => {
                                                                                                const updated = prev.map(b => {
                                                                                                    if (selectedBookIds.includes(b.id) && (b.tags || []).includes(tagId)) {
                                                                                                        return { ...b, tags: (b.tags || []).filter(t => t !== tagId) };
                                                                                                    }
                                                                                                    return b;
                                                                                                });
                                                                                                 saveBooksToIndexedDB(updated);
                                                                                                return updated;
                                                                                            });
                                                                                            // Toast
                                                                                            setClipboardMessage(`Removed "${tagRegistry[tagId]?.label || tagId}" from ${bookCount} book${bookCount !== 1 ? 's' : ''}`);
                                                                                            setFooterClipboardVisible(false);
                                                                                            setToastVisible(true);
                                                                                            setToastAnimating(false);
                                                                                            setTimeout(() => {
                                                                                                setToastAnimating(true);
                                                                                                setTimeout(() => {
                                                                                                    setToastVisible(false);
                                                                                                    setToastAnimating(false);
                                                                                                    setFooterClipboardVisible(true);
                                                                                                }, 1000);
                                                                                            }, 1500);
                                                                                        }}>
                                                                                        ×
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        <div className="border-t border-gray-200 my-1"></div>
                                                                    </>
                                                                );
                                                            }
                                                            return null;
                                                        })()}

                                                        {/* Add tag section */}
                                                        <div className="px-3 py-1 text-xs font-semibold text-gray-500">
                                                            Add Tag
                                                        </div>
                                                        <div className="px-2 py-1">
                                                            <input
                                                                type="text"
                                                                value={tagInputValue}
                                                                placeholder="Type to search or create..."
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                autoFocus
                                                                onClick={(e) => e.stopPropagation()}
                                                                onKeyDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.key === 'Escape') {
                                                                        setContextSubmenu(null);
                                                                        setTagInputValue('');
                                                                    } else if (e.key === 'Enter') {
                                                                        const inputValue = tagInputValue.toLowerCase().trim();
                                                                        if (!inputValue) return;

                                                                        // Check for exact match in registry
                                                                        const exactMatch = Object.entries(tagRegistry)
                                                                            .find(([id, data]) => data.label.toLowerCase() === inputValue);

                                                                        const selectedBookIds = Array.from(explorerSelectedBooks);

                                                                        if (exactMatch) {
                                                                            // Add existing tag to books that don't have it
                                                                            const [tagId] = exactMatch;
                                                                            let addedCount = 0;
                                                                            setBooks(prev => {
                                                                                const updated = prev.map(b => {
                                                                                    if (selectedBookIds.includes(b.id) && !(b.tags || []).includes(tagId)) {
                                                                                        addedCount++;
                                                                                        return { ...b, tags: [...(b.tags || []), tagId] };
                                                                                    }
                                                                                    return b;
                                                                                });
                                                                                saveBooksToIndexedDB(updated);
                                                                                 return updated;
                                                                            });
                                                                                        } else {
                                                                            const newTagId = inputValue.replace(/\s+/g, '-');
                                                                            const newTagLabel = tagInputValue.trim();
                                                                            setTagRegistry(prev => ({
                                                                                ...prev,
                                                                                [newTagId]: { label: newTagLabel, count: selectedBookIds.length }
                                                                            }));
                                                                            setBooks(prev => {
                                                                                const updated = prev.map(b => {
                                                                                    if (selectedBookIds.includes(b.id)) {
                                                                                        return { ...b, tags: [...(b.tags || []), newTagId] };
                                                                                    }
                                                                                    return b;
                                                                                });
                                                                                saveBooksToIndexedDB(updated);
                                                                                return updated;
                                                                            });
                                                                        }
                                                                        setTagInputValue('');
                                                                        setExplorerBookContextMenu(null);
                                                                        setContextSubmenu(null);
                                                                    }
                                                                }}
                                                                onChange={(e) => setTagInputValue(e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Tag suggestions */}
                                                        {(() => {
                                                            const inputValue = tagInputValue.toLowerCase().trim();
                                                            // Get tags that aren't on ALL selected books
                                                            const tagsOnAllBooks = new Set();
                                                            if (selectedBooksArray.length > 0) {
                                                                const firstBookTags = selectedBooksArray[0].tags || [];
                                                                firstBookTags.forEach(tagId => {
                                                                    if (selectedBooksArray.every(b => (b.tags || []).includes(tagId))) {
                                                                        tagsOnAllBooks.add(tagId);
                                                                    }
                                                                });
                                                            }

                                                            const availableTags = Object.entries(tagRegistry)
                                                                .filter(([id, data]) =>
                                                                    (!inputValue || data.label.toLowerCase().includes(inputValue)) &&
                                                                    !tagsOnAllBooks.has(id)
                                                                )
                                                                .sort((a, b) => a[1].label.localeCompare(b[1].label))
                                                                .slice(0, 10); // Limit to 10

                                                            const exactMatchExists = Object.entries(tagRegistry)
                                                                .some(([id, data]) => data.label.toLowerCase() === inputValue);
                                                            const showCreate = inputValue && !exactMatchExists;

                                                            return (
                                                                <div className="max-h-[150px] overflow-y-auto">
                                                                    {showCreate && (
                                                                        <div
                                                                            className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-blue-600 text-sm flex items-center gap-2"
                                                                            onClick={() => {
                                                                                const newTagId = inputValue.replace(/\s+/g, '-');
                                                                                const newTagLabel = tagInputValue.trim();
                                                                                const selectedBookIds = Array.from(explorerSelectedBooks);
                                                                                setTagRegistry(prev => ({
                                                                                    ...prev,
                                                                                    [newTagId]: { label: newTagLabel, count: selectedBookIds.length }
                                                                                }));
                                                                                setBooks(prev => {
                                                                                    const updated = prev.map(b => {
                                                                                        if (selectedBookIds.includes(b.id)) {
                                                                                            return { ...b, tags: [...(b.tags || []), newTagId] };
                                                                                        }
                                                                                        return b;
                                                                                    });
                                                                                    saveBooksToIndexedDB(updated);
                                                                                    return updated;
                                                                                });
                                                                                setTagInputValue('');
                                                                                setExplorerBookContextMenu(null);
                                                                                setContextSubmenu(null);
                                                                            }}>
                                                                            <span>➕</span>
                                                                            <span>Create "{tagInputValue.trim()}"</span>
                                                                        </div>
                                                                    )}
                                                                    {availableTags.map(([tagId, tagData]) => (
                                                                        <div
                                                                            key={tagId}
                                                                            className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm flex items-center justify-between"
                                                                            onClick={() => {
                                                                                const selectedBookIds = Array.from(explorerSelectedBooks);
                                                                                let addedCount = 0;
                                                                                setBooks(prev => {
                                                                                    const updated = prev.map(b => {
                                                                                        if (selectedBookIds.includes(b.id) && !(b.tags || []).includes(tagId)) {
                                                                                            addedCount++;
                                                                                            return { ...b, tags: [...(b.tags || []), tagId] };
                                                                                        }
                                                                                        return b;
                                                                                    });
                                                                                    saveBooksToIndexedDB(updated);
                                                                                     return updated;
                                                                                });
                                                                                if (addedCount > 0) {
                                                                                    setClipboardMessage(`Added "${tagData.label}" to ${addedCount} book${addedCount !== 1 ? 's' : ''}`);
                                                                                    setFooterClipboardVisible(false);
                                                                                    setToastVisible(true);
                                                                                    setToastAnimating(false);
                                                                                    setTimeout(() => {
                                                                                        setToastAnimating(true);
                                                                                        setTimeout(() => {
                                                                                            setToastVisible(false);
                                                                                            setToastAnimating(false);
                                                                                            setFooterClipboardVisible(true);
                                                                                        }, 1000);
                                                                                    }, 1500);
                                                                                }
                                                                                setTagInputValue('');
                                                                                setExplorerBookContextMenu(null);
                                                                                setContextSubmenu(null);
                                                                            }}>
                                                                            <span>{tagData.label}</span>
                                                                            <span className="text-xs text-gray-400">({getTagCount(tagId)})</span>
                                                                        </div>
                                                                    ))}
                                                                    {availableTags.length === 0 && !showCreate && (
                                                                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                                                                            {Object.keys(tagRegistry).length === 0
                                                                                ? 'No tags yet. Type to create one.'
                                                                                : 'No matching tags'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Manage Tags link */}
                                                        <div className="border-t border-gray-200 mt-1 pt-1">
                                                            <div
                                                                className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm text-blue-600"
                                                                onClick={() => {
                                                                    setTagManagementOpen(true);
                                                                    setExplorerBookContextMenu(null);
                                                                    setContextSubmenu(null);
                                                                }}>
                                                                ⚙️ Manage Tags...
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Set Price Goal submenu */}
                                            <div
                                                className="submenu-trigger px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 relative"
                                                onMouseEnter={() => setContextSubmenu('price-goal')}
                                                onMouseLeave={(e) => {
                                                    setTimeout(() => {
                                                        const activeSubmenu = document.querySelector('.context-submenu:hover');
                                                        const activeTrigger = document.querySelector('.submenu-trigger:hover');
                                                        if (!activeSubmenu && !activeTrigger) {
                                                            setContextSubmenu(null);
                                                        }
                                                    }, 600);
                                                }}>
                                                <span>💰</span>
                                                <span>Set Price Goal</span>
                                                <span className="ml-auto">▶</span>

                                                {/* Price Goal Submenu - v5.0.0-alpha.169.9 viewport-aware vertical positioning */}
                                                {contextSubmenu === 'price-goal' && (
                                                    <div
                                                        className="context-submenu absolute bg-white border border-gray-300 shadow-lg rounded py-1 min-w-[150px] z-[70]"
                                                        style={{
                                                            [submenuOnLeft ? 'right' : 'left']: '100%',
                                                            [priceGoalSubmenuOverflows ? 'bottom' : 'top']: '0'
                                                        }}
                                                        onMouseEnter={() => setContextSubmenu('price-goal')}
                                                        onMouseLeave={() => setContextSubmenu(null)}
                                                        onClick={(e) => e.stopPropagation()}>
                                                        {/* Preset prices */}
                                                        {/* v5.0.0-alpha.167.1 - Show current price goal in bold */}
                                                        {[0.99, 1.99, 2.99, 3.99, 4.99].map(price => {
                                                            const hasThisGoal = selectedBooksArray.some(b => b.priceTrigger === price);
                                                            return (
                                                                <div
                                                                    key={price}
                                                                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${hasThisGoal ? 'font-bold' : ''}`}
                                                                    onClick={async () => {
                                                                    const selectedBookIds = Array.from(explorerSelectedBooks);
                                                                    setBooks(prev => {
                                                                        const updated = prev.map(b =>
                                                                            selectedBookIds.includes(b.id) ? { ...b, priceTrigger: price } : b
                                                                        );
                                                                        saveBooksToIndexedDB(updated);
                                                                        return updated;
                                                                    });
                                                                    // Toast feedback
                                                                    setClipboardMessage(`Price goal set to $${price.toFixed(2)} for ${count} book${count !== 1 ? 's' : ''}`);
                                                                    setFooterClipboardVisible(false);
                                                                    setToastVisible(true);
                                                                    setToastAnimating(false);
                                                                    setTimeout(() => {
                                                                        setToastAnimating(true);
                                                                        setTimeout(() => {
                                                                            setToastVisible(false);
                                                                            setToastAnimating(false);
                                                                            setFooterClipboardVisible(true);
                                                                        }, 1000);
                                                                    }, 1500);
                                                                    setExplorerBookContextMenu(null);
                                                                    setContextSubmenu(null);
                                                                }}>
                                                                ${price.toFixed(2)}
                                                            </div>
                                                            );
                                                        })}
                                                        <div
                                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => {
                                                                // v5.0.0-alpha.169.8 - Store Explorer selection before opening modal
                                                                setBulkPriceBookIds(Array.from(explorerSelectedBooks));
                                                                setShowBulkPriceModal(true);
                                                                setExplorerBookContextMenu(null);
                                                                setContextSubmenu(null);
                                                            }}>
                                                            Custom...
                                                        </div>
                                                        <div className="border-t border-gray-200 my-1"></div>
                                                        <div
                                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600"
                                                            onClick={async () => {
                                                                const selectedBookIds = Array.from(explorerSelectedBooks);
                                                                setBooks(prev => {
                                                                    const updated = prev.map(b =>
                                                                        selectedBookIds.includes(b.id) ? { ...b, priceTrigger: null } : b
                                                                    );
                                                                    saveBooksToIndexedDB(updated);
                                                                    return updated;
                                                                });
                                                                // Toast feedback
                                                                setClipboardMessage(`Price goal cleared for ${count} book${count !== 1 ? 's' : ''}`);
                                                                setFooterClipboardVisible(false);
                                                                setToastVisible(true);
                                                                setToastAnimating(false);
                                                                setTimeout(() => {
                                                                    setToastAnimating(true);
                                                                    setTimeout(() => {
                                                                        setToastVisible(false);
                                                                        setToastAnimating(false);
                                                                        setFooterClipboardVisible(true);
                                                                    }, 1000);
                                                                }, 1500);
                                                                setExplorerBookContextMenu(null);
                                                                setContextSubmenu(null);
                                                            }}>
                                                            Clear Price Goal
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* v5.0.0-alpha.168.3 - Hide/Unhide and Remove section */}
                                            <div className="border-t border-gray-200 my-1"></div>

                                            {/* Hide Book */}
                                            {(() => {
                                                const allHidden = selectedBooksArray.every(b => b.isHidden);
                                                return (
                                                    <div
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                                        onClick={async () => {
                                                            const newHiddenState = !allHidden;
                                                            const bookIdsToToggle = Array.from(explorerSelectedBooks);
                                                            const previousStates = {};
                                                            bookIdsToToggle.forEach(id => {
                                                                const book = books.find(b => b.id === id);
                                                                previousStates[id] = book?.isHidden || false;
                                                            });

                                                            const updatedBooks = books.map(book => {
                                                                if (bookIdsToToggle.includes(book.id)) {
                                                                    return { ...book, isHidden: newHiddenState };
                                                                }
                                                                return book;
                                                            });
                                                            setBooks(updatedBooks);
                                                            await saveBooksToIndexedDB(updatedBooks);

                                                            recordAction({
                                                                type: 'TOGGLE_HIDE',
                                                                bookIds: bookIdsToToggle,
                                                                previousStates: previousStates,
                                                                newState: newHiddenState
                                                            });

                                                            setExplorerBookContextMenu(null);
                                                            setContextSubmenu(null);
                                                        }}>
                                                        <span>{allHidden ? '👁️' : '🚫'}</span>
                                                        <span>{allHidden ? 'Unhide' : 'Hide'} Book{count !== 1 ? 's' : ''}</span>
                                                    </div>
                                                );
                                            })()}

                                            {/* Remove from Folder */}
                                            {isSpecialFolder ? (
                                                <div
                                                    className="px-4 py-2 text-gray-400 cursor-not-allowed flex items-center gap-3"
                                                    title="Cannot remove books from virtual folders">
                                                    <span>🗑️</span>
                                                    <span>Remove from Folder</span>
                                                    <span className="ml-auto text-xs">Del</span>
                                                </div>
                                            ) : (
                                                <div
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-red-600"
                                                    onClick={() => {
                                                        const folder = folders.find(f => f.id === selectedFolderId);
                                                        if (!folder) return;

                                                        const bookIdsToRemove = Array.from(explorerSelectedBooks);
                                                        const fromIndices = bookIdsToRemove.map(id => (folder.bookIds || []).indexOf(id));

                                                        setFolders(prev => prev.map(f => {
                                                            if (f.id === selectedFolderId) {
                                                                return { ...f, bookIds: (f.bookIds || []).filter(id => !explorerSelectedBooks.has(id)) };
                                                            }
                                                            return f;
                                                        }));

                                                        recordAction({
                                                            type: 'REMOVE_BOOKS_FOLDER',
                                                            folderId: selectedFolderId,
                                                            bookIds: bookIdsToRemove,
                                                            fromIndices: fromIndices
                                                        });

                                                        console.log(`🗑️ Removed ${bookIdsToRemove.length} book(s) from "${folder.name}"`);
                                                        setExplorerSelectedBooks(new Set());
                                                        setExplorerBookContextMenu(null);
                                                        setContextSubmenu(null);
                                                    }}>
                                                    <span>🗑️</span>
                                                    <span>Remove from Folder</span>
                                                    <span className="ml-auto text-xs text-gray-400">Del</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        );
                    })()}

                    {/* Folder Properties Dialog - v5.0.0-alpha.142 */}
                    {folderPropertiesDialog && (() => {
                        const folder = folders.find(f => f.id === folderPropertiesDialog.folderId);
                        if (!folder) return null;

                        const isSpecialFolder = ['__all__', '__inbox__', '__library__'].includes(folder.id);

                        // Calculate folder statistics
                        const getAllDescendantIds = (folderId) => {
                            const children = folders.filter(f => f.parentId === folderId);
                            let allIds = children.map(c => c.id);
                            children.forEach(child => {
                                allIds = [...allIds, ...getAllDescendantIds(child.id)];
                            });
                            return allIds;
                        };

                        // v5.0.0-alpha.144 - Fix: Use folder.bookIds, not b.folderIds
                        const getAllBooksInFolder = (folderId) => {
                            const bookIds = getFolderBookIds(folderId);
                            return books.filter(b => bookIds.includes(b.id));
                        };

                        const directChildren = folders.filter(f => f.parentId === folder.id);
                        const allDescendantIds = getAllDescendantIds(folder.id);
                        const directBooks = getAllBooksInFolder(folder.id);
                        const totalBooks = directBooks.length;
                        const ownedBooks = directBooks.filter(b => !b.onWishlist).length;
                        const wishlistBooks = directBooks.filter(b => b.onWishlist).length;

                        // Calculate recursive total
                        const recursiveBookIds = new Set();
                        [folder.id, ...allDescendantIds].forEach(fid => {
                            getAllBooksInFolder(fid).forEach(b => recursiveBookIds.add(b.id));
                        });
                        const recursiveTotalBooks = recursiveBookIds.size;

                        // v5.0.0-alpha.143 - Use top-level state for edited name to avoid hooks violation
                        const handleSave = () => {
                            if (!folderPropertiesEditedName.trim()) {
                                alert('Folder name cannot be empty');
                                return;
                            }

                            // Check for duplicate names at same level
                            const siblings = folders.filter(f => f.parentId === folder.parentId && f.id !== folder.id);
                            if (siblings.some(f => f.name === folderPropertiesEditedName.trim())) {
                                alert('A folder with this name already exists at this level');
                                return;
                            }

                            // Update folder - v5.0.0-alpha.144: Removed modified timestamp (not tracked)
                            setFolders(prev => prev.map(f =>
                                f.id === folder.id ? { ...f, name: folderPropertiesEditedName.trim() } : f
                            ));

                            setFolderPropertiesDialog(null);
                            console.log(`💾 Updated folder "${folder.name}" → "${folderPropertiesEditedName.trim()}"`);
                        };

                        return (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-50 z-50"
                                    onClick={() => setFolderPropertiesDialog(null)}
                                />

                                {/* Dialog - v5.0.0-alpha.144: Draggable */}
                                <div
                                    className="bg-white rounded-lg shadow-xl w-full max-w-md pointer-events-auto fixed z-50"
                                    style={{
                                        left: `${dialogDrag?.dialogX || 0}px`,
                                        top: `${dialogDrag?.dialogY || 0}px`,
                                        cursor: dialogDrag?.isDragging ? 'grabbing' : 'default'
                                    }}
                                    onClick={(e) => e.stopPropagation()}>
                                    <h2
                                        className="text-xl font-semibold mb-4 p-6 pb-0 cursor-grab active:cursor-grabbing select-none"
                                        onMouseDown={(e) => {
                                            const rect = e.currentTarget.parentElement.getBoundingClientRect();
                                            setDialogDrag({
                                                isDragging: true,
                                                offsetX: e.clientX - rect.left,
                                                offsetY: e.clientY - rect.top,
                                                dialogX: rect.left,
                                                dialogY: rect.top
                                            });
                                        }}>
                                        Folder Properties
                                    </h2>
                                    <div className="px-6 pb-6">

                                        {/* Name */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            {isSpecialFolder ? (
                                                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700">
                                                    {folder.name}
                                                    <span className="ml-2 text-xs text-gray-500">(System folder)</span>
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={folderPropertiesEditedName}
                                                    onChange={(e) => setFolderPropertiesEditedName(e.target.value)}
                                                    autoFocus
                                                />
                                            )}
                                        </div>

                                        {/* Statistics - v5.0.0-alpha.144: Removed created/modified dates */}
                                        <div className="border-t border-gray-200 pt-4 mb-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Books:</span>
                                                <span className="text-gray-900">
                                                    {totalBooks} total ({ownedBooks} owned, {wishlistBooks} wishlist)
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Subfolders:</span>
                                                <span className="text-gray-900">{directChildren.length}</span>
                                            </div>
                                            {allDescendantIds.length > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Total books (recursive):</span>
                                                    <span className="text-gray-900">{recursiveTotalBooks}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                                                onClick={() => setFolderPropertiesDialog(null)}>
                                                Cancel
                                            </button>
                                            {!isSpecialFolder && (
                                                <button
                                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                    onClick={handleSave}>
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Affiliate Disclosure Footer (v4.4.0) */}
                    {/* v4.16.0.j - Restructured to include clipboard message on left */}
                    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 py-1 px-4 text-xs text-gray-500 z-40 flex items-center justify-between">
                        {/* Left: Clipboard and Selection status (v4.16.0.n - clipboard first for toast target) */}
                        <div className="text-left flex items-center gap-3">
                            {/* Clipboard (always leftmost for toast animation target) */}
                            {/* v4.16.0.o - Only show when footerClipboardVisible (after toast lands) */}
                            {clipboardMessage && footerClipboardVisible && (
                                <span className="flex items-center gap-1">
                                    {clipboardMessage}
                                    <button
                                        onClick={() => {
                                            setClipboard(null);
                                            setClipboardMessage(null);
                                            setToastVisible(false);
                                            setToastAnimating(false);
                                            setFooterClipboardVisible(false);
                                        }}
                                        className="ml-1 text-gray-400 hover:text-gray-600"
                                        title="Clear clipboard (or press Escape)"
                                        style={{ fontSize: '14px', lineHeight: '1' }}
                                    >✕</button>
                                </span>
                            )}
                            {/* Separator when both present */}
                            {clipboardMessage && footerClipboardVisible && selectedBooks.size > 0 && <span className="text-gray-400">•</span>}
                            {/* Selection count */}
                            {selectedBooks.size > 0 && (
                                <span className="flex items-center gap-1">
                                    {selectedBooks.size} book{selectedBooks.size !== 1 ? 's' : ''} selected
                                    <button
                                        onClick={() => clearSelection()}
                                        className="ml-1 text-gray-400 hover:text-gray-600"
                                        title="Clear selection (or press Escape)"
                                        style={{ fontSize: '14px', lineHeight: '1' }}
                                    >✕</button>
                                </span>
                            )}
                            {/* Non-breaking space when both empty to maintain layout */}
                            {!clipboardMessage && selectedBooks.size === 0 && '\u00A0'}
                        </div>
                        {/* Center: Affiliate disclosure */}
                        <div className="text-center flex-1">
                            As an Amazon Associate, I earn from qualifying purchases. | <a href="https://github.com/Ron-L/ReaderWrangler/issues" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700" title="Report issues or request features">Feedback</a> | <a href="security.html" className="hover:text-gray-700" title="Security & Privacy information">Security</a>
                        </div>
                        {/* Right: Build version */}
                        <div className="text-right">
                            Build v{ORGANIZER_VERSION}
                        </div>
                    </div>
                </div>
            );
        }

        ReactDOM.render(<ReaderWrangler />, document.getElementById('root'));

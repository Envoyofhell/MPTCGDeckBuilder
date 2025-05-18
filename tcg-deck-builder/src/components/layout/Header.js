import { useContext, useState } from 'react';
import Container from 'react-bootstrap/Container';
import NavBar from 'react-bootstrap/Navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon as farMoon } from '@fortawesome/free-regular-svg-icons'; // regular moon
import { faSun as fasSun } from '@fortawesome/free-solid-svg-icons'; // solid sun
import { AppThemeContext } from '../../context/AppThemeContext'; // Ensure this path is correct
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import './Header.css'; // This will link to the themed Header.css
import changelogData, { latestVersion } from '../../utils/changelogData'; // Ensure this path is correct

function Header() {
    const { theme, toggleTheme } = useContext(AppThemeContext);
    const darkMode = theme === 'dark';
    const [showChangelogModal, setShowChangelogModal] = useState(false);
    // This class is crucial for applying the correct theme styles from Header.css
    const modalThemeClass = theme === 'dark' ? 'bg-dark text-white changelog-modal-dark' : 'changelog-modal-light';

    const handleCloseChangelog = () => setShowChangelogModal(false);
    const handleShowChangelog = () => setShowChangelogModal(true);

    const currentVersionLog = Array.isArray(changelogData) && changelogData.length > 0
        ? changelogData.find(log => log.version === latestVersion.version) || latestVersion
        : latestVersion;

    // Keywords and their corresponding CSS classes
    const keywordsMap = {
        "ADDED:": "changelog-keyword-added",
        "IMPROVED:": "changelog-keyword-improved",
        "FIXED:": "changelog-keyword-fixed",
        "CHANGED:": "changelog-keyword-changed",
        "REMOVED:": "changelog-keyword-removed",
        "REDUCED:": "changelog-keyword-reduced",
        "REPLACED:": "changelog-keyword-replaced",
        "NEW:": "changelog-keyword-new",
        "UPDATED:": "changelog-keyword-updated",
        // For section titles within items
        "**Custom Card Creation System:**": "changelog-subsection-title",
        "**Deck Import/Export System:**": "changelog-subsection-title",
        "**Data Storage Optimizations:**": "changelog-subsection-title",
        "**Enhanced TCG Controller (`src/utils/TCGapi/EnhancedTCGController.js`):**": "changelog-subsection-title tech-path",
        "**Custom Card Creator (`src/components/modals/CustomCardCreator.js`):**": "changelog-subsection-title tech-path",
        "**TCG Sim Controller (`src/utils/TCGsim/TCGSimController.js`):**": "changelog-subsection-title tech-path",
    };

    const renderChangelogItem = (itemText) => {
        let remainingText = String(itemText);
        const elements = [];
        let keyIndex = 0;

        // Handle subsection titles first if they are part of the item string
        for (const keyword in keywordsMap) {
            if (remainingText.startsWith(keyword) && keywordsMap[keyword].includes('subsection-title')) {
                elements.push(<span key={`kw-${keyIndex++}`} className={keywordsMap[keyword]}>{keyword.replace(/\*\*/g, '')}</span>);
                remainingText = remainingText.substring(keyword.length);
                break; 
            }
        }
        
        const keywordRegex = new RegExp(`^(${Object.keys(keywordsMap).filter(k => !keywordsMap[k].includes('subsection-title')).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*`, 'i');
        const match = remainingText.match(keywordRegex);

        if (match) {
            const matchedKeyword = match[1].toUpperCase(); 
            const keywordClass = keywordsMap[matchedKeyword];
            if (keywordClass) {
                elements.push(<span key={`kw-${keyIndex++}`} className={`changelog-keyword ${keywordClass}`}>{match[1]}</span>);
                remainingText = remainingText.substring(match[0].length);
            }
        }

        const parts = remainingText.split(/(\*\*.*?\*\*)/g);
        parts.forEach((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                elements.push(<strong key={`strong-${keyIndex}-${index}`}>{part.substring(2, part.length - 2)}</strong>);
            } else {
                elements.push(<span key={`text-${keyIndex}-${index}`}>{part}</span>);
            }
        });
        keyIndex++;
        return elements;
    };


    return (
        <NavBar bg={darkMode ? "dark" : "light"} data-bs-theme={darkMode ? "dark" : "light"} fixed='top'>
            <Container style={{ paddingLeft: '20px' }} fluid={true}>
                <NavBar.Brand>Pokemon TCG Deck Builder</NavBar.Brand>
                {latestVersion && latestVersion.version && (
                    <Badge bg='primary' onClick={handleShowChangelog} className="badge-hover ms-2" pill>
                        v{latestVersion.version}
                    </Badge>
                )}
            </Container>
            <NavBar.Collapse className='justify-content-end'>
                <Container fluid={true} style={{ paddingRight: '20px' }}>
                    <FontAwesomeIcon icon={darkMode ? farMoon : fasSun} onClick={toggleTheme} size='xl' style={{cursor: 'pointer'}} />
                </Container>
            </NavBar.Collapse>

            {currentVersionLog && (
                // Ensure modalThemeClass is applied here for the theme styles to take effect
                <Modal show={showChangelogModal} onHide={handleCloseChangelog} contentClassName={`${modalThemeClass} changelog-modal`} size='lg' scrollable>
                    <Modal.Header closeButton className="changelog-modal-header">
                        <Modal.Title className="changelog-modal-title">Changelog - Version {currentVersionLog.version}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="changelog-modal-body">
                        {currentVersionLog.date && <p className="text-muted mb-3">Release Date: {currentVersionLog.date}</p>}
                        {currentVersionLog.changes && currentVersionLog.changes.map((category, categoryIndex) => (
                            <div key={categoryIndex} className="changelog-category mb-4">
                                <h4 className="changelog-category-title">{category.title}</h4>
                                {category.items && category.items.length > 0 ? (
                                    <ul className="list-unstyled">
                                        {category.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="changelog-item">
                                                {renderChangelogItem(item)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No specific items listed for this category.</p>
                                )}
                            </div>
                        ))}
                        <hr className="mt-4 mb-3"/>
                        <p className="text-muted small">For older versions, please refer to the project's commit history or previous release notes.</p>
                    </Modal.Body>
                </Modal>
            )}
        </NavBar>
    );
};

export default Header;
